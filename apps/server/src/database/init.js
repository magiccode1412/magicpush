require('dotenv').config();

// 设置默认时区为东八区（北京时间），可通过 TZ 环境变量覆盖
if (!process.env.TZ) {
  process.env.TZ = 'Asia/Shanghai';
}

const db = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { SettingsModel } = require('../models');
const { runMigrations } = require('./migrate');

/**
 * 数据库初始化脚本
 * 所有表结构与增量字段变更统一交由 migrate.js 的迁移表集中管理。
 */
const initDatabase = async () => {
  try {
    logger.info('开始初始化数据库...');

    // 统一执行集中管理的数据库迁移（建表 + 增量字段），由 migrations 表记录已执行版本
    runMigrations();

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
