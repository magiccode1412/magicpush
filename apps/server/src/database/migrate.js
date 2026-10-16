const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * 轻量数据库迁移
 * -------------------------------------------------------------
 * 通过 migrations 表记录已执行的迁移版本，按注册顺序幂等执行。
 * 后续新增表结构变更时，请在 MIGRATIONS 数组末尾追加一个新的迁移项，
 * 而不是在 init.js 中内联 ALTER TABLE + try/catch。
 */

// 确保迁移记录表存在
function ensureMigrationsTable() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );
  `);
}

function isApplied(name) {
  const row = db.prepare('SELECT 1 FROM migrations WHERE name = ?').get(name);
  return Boolean(row);
}

function markApplied(name) {
  db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
}

// 检查列是否已存在（用于存量库升级时幂等添加列）
function columnExists(table, column) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.some((c) => c.name === column);
}

// 幂等添加列：存量库已存在时跳过，避免 ALTER 报错
function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    logger.info(`迁移 ${table}: 新增字段 ${column}`);
    return true;
  }
  return false;
}

// 幂等创建索引（列已存在与否均安全）
function addIndex(indexName, table, columns) {
  db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${columns})`);
}

const MIGRATIONS = [
  {
    name: '001_create_users',
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          avatar TEXT,
          created_at DATETIME DEFAULT (datetime('now', 'localtime')),
          updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);
    },
  },
  {
    name: '002_create_system_settings',
    up: () => {
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
    },
  },
  {
    name: '003_create_channels',
    up: () => {
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
    },
  },
  {
    name: '004_create_endpoints',
    up: () => {
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
    },
  },
  {
    name: '005_create_endpoint_channels',
    up: () => {
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
    },
  },
  {
    name: '006_create_push_logs',
    up: () => {
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
    },
  },
  {
    name: '007_create_refresh_tokens',
    up: () => {
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
    },
  },
  {
    name: '008_users_add_role',
    up: () => {
      addColumn('users', 'role', "TEXT DEFAULT 'user' CHECK(role IN ('admin', 'user'))");
    },
  },
  {
    name: '009_push_logs_add_ip',
    up: () => {
      addColumn('push_logs', 'ip', 'TEXT');
    },
  },
  {
    name: '010_push_logs_add_request_id',
    up: () => {
      addColumn('push_logs', 'request_id', 'TEXT');
      addIndex('idx_push_logs_request_id', 'push_logs', 'request_id');
    },
  },
  {
    name: '011_push_logs_add_endpoint_name',
    up: () => {
      addColumn('push_logs', 'endpoint_name', 'TEXT');
    },
  },
  {
    name: '012_endpoints_add_inbound_config',
    up: () => {
      addColumn('endpoints', 'inbound_config', 'TEXT');
    },
  },
  {
    name: '013_endpoints_add_keyword_filter',
    up: () => {
      addColumn('endpoints', 'keyword_filter', 'TEXT');
    },
  },
  {
    name: '014_endpoints_add_content_replace',
    up: () => {
      addColumn('endpoints', 'content_replace', 'TEXT');
    },
  },
  {
    name: '014_endpoints_add_do_not_disturb',
    up: () => {
      addColumn('endpoints', 'do_not_disturb', 'TEXT');
    },
  },
];

/**
 * 执行所有尚未应用的迁移（按注册顺序，逐条事务化）
 */
const runMigrations = () => {
  ensureMigrationsTable();

  const pending = MIGRATIONS.filter((m) => !isApplied(m.name));
  if (pending.length === 0) {
    logger.info('数据库迁移：无待执行项');
    return;
  }

  for (const migration of pending) {
    logger.info(`数据库迁移：开始执行 ${migration.name}`);
    const tx = db.transaction(() => {
      migration.up();
      markApplied(migration.name);
    });
    tx();
    logger.info(`数据库迁移：完成 ${migration.name}`);
  }
};

module.exports = { runMigrations, MIGRATIONS, columnExists, addColumn };
