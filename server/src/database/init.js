require('dotenv').config();

// 设置默认时区为东八区（北京时间），可通过 TZ 环境变量覆盖
if (!process.env.TZ) {
  process.env.TZ = 'Asia/Shanghai';
}

const db = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { SettingsModel } = require('../models');

/**
 * 数据库初始化脚本
 */
const initDatabase = async () => {
  try {
    logger.info('开始初始化数据库...');

    // 创建用户表
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        avatar TEXT,
        role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user')),
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    logger.info('用户表创建成功');

    // 迁移：为已存在的用户表添加 role 字段
    try {
      db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user'))`);
      logger.info('已为用户表添加 role 字段');
    } catch (e) {
      // 字段已存在，忽略错误
    }

    // 创建系统设置表
    db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
      );

      CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(key);
    `);
    logger.info('系统设置表创建成功');

    // 创建渠道表
    db.exec(`
      CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        channel_type TEXT NOT NULL,
        name TEXT NOT NULL,
        config TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_channels_user_id ON channels(user_id);
      CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(channel_type);
    `);
    logger.info('渠道表创建成功');

    // 创建推送接口表
    db.exec(`
      CREATE TABLE IF NOT EXISTS endpoints (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        last_used_at DATETIME,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_endpoints_user_id ON endpoints(user_id);
      CREATE INDEX IF NOT EXISTS idx_endpoints_token ON endpoints(token);
    `);
    logger.info('推送接口表创建成功');

    // 创建接口-渠道关联表
    db.exec(`
      CREATE TABLE IF NOT EXISTS endpoint_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint_id INTEGER NOT NULL,
        channel_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE,
        UNIQUE(endpoint_id, channel_id)
      );

      CREATE INDEX IF NOT EXISTS idx_endpoint_channels_endpoint ON endpoint_channels(endpoint_id);
      CREATE INDEX IF NOT EXISTS idx_endpoint_channels_channel ON endpoint_channels(channel_id);
    `);
    logger.info('接口-渠道关联表创建成功');

    // 创建推送记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS push_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint_id INTEGER,
        channel_id INTEGER,
        channel_type TEXT,
        title TEXT,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        status TEXT NOT NULL,
        response TEXT,
        error_message TEXT,
        ip TEXT,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (endpoint_id) REFERENCES endpoints(id) ON DELETE SET NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_push_logs_user_id ON push_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_push_logs_endpoint ON push_logs(endpoint_id);
      CREATE INDEX IF NOT EXISTS idx_push_logs_channel ON push_logs(channel_id);
      CREATE INDEX IF NOT EXISTS idx_push_logs_status ON push_logs(status);
      CREATE INDEX IF NOT EXISTS idx_push_logs_created_at ON push_logs(created_at);
    `);
    logger.info('推送记录表创建成功');

    // 迁移：为已存在的推送记录表添加 ip 字段
    try {
      db.exec(`ALTER TABLE push_logs ADD COLUMN ip TEXT`);
      logger.info('已为推送记录表添加 ip 字段');
    } catch (e) {
      // 字段已存在，忽略错误
    }

    // 创建刷新令牌表（用于令牌吊销）
    db.exec(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
    `);
    logger.info('刷新令牌表创建成功');

    logger.info('数据库初始化完成！');

    // 开发环境：创建默认测试账号
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        db.prepare(`
          INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)
        `).run('admin', 'admin@example.com', hashedPassword, 'admin');
        logger.info('✅ 默认测试账号已创建: admin / admin123');
        // 首个用户（默认账号）创建后，关闭注册
        SettingsModel.setBoolean('registration_enabled', false);
        logger.info('默认账号已创建，自动关闭注册功能');
      } else {
        // 确保测试账号是 admin
        db.prepare(`UPDATE users SET role = 'admin' WHERE username = 'admin'`).run();
        logger.info('默认测试账号已存在');
      }
    }

    // 确保所有数据写入磁盘
    db.prepare('PRAGMA wal_checkpoint(TRUNCATE)').run();
    logger.info('数据库检查点完成，数据已同步到磁盘');

    return true;
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    throw error;
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase().then(() => {
    // 关闭数据库连接
    const db = require('../config/database');
    db.close();
    process.exit(0);
  }).catch(() => process.exit(1));
}

module.exports = initDatabase;
