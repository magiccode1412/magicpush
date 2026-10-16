# 后端开发指南

本文档说明如何在 MagicPush 后端添加新的功能模块，包括控制器、服务、模型、中间件、路由的标准开发步骤。

---

## 目录

- [1. 新增 CRUD 功能模块](#1-新增-crud-功能模块)
  - [1.1 创建 Model](#11-创建-model)
  - [1.2 创建 Service](#12-创建-service)
  - [1.3 创建 Controller](#13-创建-controller)
  - [1.4 创建 Route](#14-创建-route)
  - [1.5 注册路由](#15-注册路由)
- [2. 新增中间件](#2-新增中间件)
- [3. 添加数据库迁移](#3-添加数据库迁移)
- [4. 添加新的 API 端点](#4-添加新的-api-端点)

---

## 1. 新增 CRUD 功能模块

以新增一个「通知模板」功能为例（假设需要管理消息模板）。

### 1.1 创建 Model

文件：`apps/server/src/models/notificationTemplate.model.js`

```javascript
const db = require('../config/database');

/**
 * 通知模板模型
 */
class NotificationTemplateModel {
  /**
   * 根据ID查询模板
   */
  static findById(id) {
    const stmt = db.prepare(
      'SELECT * FROM notification_templates WHERE id = ?'
    );
    const row = stmt.get(id);
    return row ? this.rowToCamelCase(row) : null;
  }

  /**
   * 查询用户的所有模板
   */
  static findByUserId(userId) {
    const stmt = db.prepare(
      'SELECT * FROM notification_templates WHERE user_id = ? ORDER BY created_at DESC'
    );
    return stmt.all(userId).map(row => this.rowToCamelCase(row));
  }

  /**
   * 创建模板
   */
  static create(data) {
    const stmt = db.prepare(`
      INSERT INTO notification_templates (user_id, name, title_template, content_template)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      data.userId,
      data.name,
      data.titleTemplate,
      data.contentTemplate
    );
    return this.findById(result.lastInsertRowid);
  }

  /**
   * 更新模板
   */
  static update(id, data) {
    const fields = [];
    const values = [];

    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.titleTemplate !== undefined) { fields.push('title_template = ?'); values.push(data.titleTemplate); }
    if (data.contentTemplate !== undefined) { fields.push('content_template = ?'); values.push(data.contentTemplate); }

    if (fields.length === 0) return this.findById(id);

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    const stmt = db.prepare(`UPDATE notification_templates SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return this.findById(id);
  }

  /**
   * 删除模板
   */
  static delete(id) {
    const stmt = db.prepare('DELETE FROM notification_templates WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * 将 snake_case 行数据转换为 camelCase 对象
   */
  static rowToCamelCase(row) {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      titleTemplate: row.title_template,
      contentTemplate: row.content_template,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

module.exports = NotificationTemplateModel;
```

**Model 编写规范：**
- 类名使用 PascalCase + `Model` 后缀：`XxxModel`
- 方法全部使用 `static`
- 数据库操作使用同步 API (`stmt.get()` / `stmt.all()` / `stmt.run()`)
- 返回值做 snake_case → camelCase 映射（通过 `rowToCamelCase` 方法）
- 不包含业务逻辑，只负责 SQL 封装

### 1.2 创建 Service

文件：`apps/server/src/services/notificationTemplate.service.js`

```javascript
const NotificationTemplateModel = require('../models/notificationTemplate.model');

/**
 * 通知模板服务
 */
class NotificationTemplateService {
  /**
   * 获取用户的所有模板
   */
  static getByUser(userId) {
    return NotificationTemplateModel.findByUserId(userId);
  }

  /**
   * 获取单个模板详情
   */
  static getById(id, userId) {
    const template = NotificationTemplateModel.findById(id);
    if (!template) throw new Error('模板不存在');
    if (template.userId !== userId) throw new Error('无权访问此模板');
    return template;
  }

  /**
   * 创建模板
   */
  static create(userId, data) {
    // 业务校验：名称不能为空
    if (!data.name || data.name.trim() === '') {
      throw new Error('模板名称不能为空');
    }

    return NotificationTemplateModel.create({
      userId,
      name: data.name.trim(),
      titleTemplate: data.titleTemplate || '',
      contentTemplate: data.contentTemplate || '',
    });
  }

  /**
   * 更新模板
   */
  static update(id, userId, data) {
    // 先校验权限
    const existing = this.getById(id, userId);
    return NotificationTemplateModel.update(id, data);
  }

  /**
   * 删除模板
   */
  static delete(id, userId) {
    // 先校验权限
    this.getById(id, userId);
    const deleted = NotificationTemplateModel.delete(id);
    if (!deleted) throw new Error('删除失败');
    return { message: '删除成功' };
  }
}

module.exports = NotificationTemplateService;
```

**Service 编写规范：**
- 类名使用 PascalCase + `Service` 后缀：`XxxService`
- 方法全部使用 `static`
- 包含业务逻辑校验和权限检查
- 校验失败时 `throw new Error('中文描述')`
- **不处理 HTTP 响应**，异常上浮到 Controller

### 1.3 创建 Controller

文件：`apps/server/src/controllers/notificationTemplate.controller.js`

```javascript
const NotificationTemplateService = require('../services/notificationTemplate.service');
const logger = require('../utils/logger');
const ResponseUtil = require('../utils/response');

/**
 * 通知模板控制器
 */
class NotificationTemplateController {
  /**
   * 获取模板列表
   */
  static async list(req, res) {
    try {
      const templates = await NotificationTemplateService.getByUser(req.user.id);
      return ResponseUtil.success(res, templates);
    } catch (error) {
      logger.error('获取模板列表失败:', error);
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 获取模板详情
   */
  static async detail(req, res) {
    try {
      const template = await NotificationTemplateService.getById(
        req.params.id,
        req.user.id
      );
      return ResponseUtil.success(res, template);
    } catch (error) {
      logger.error('获取模板详情失败:', error);
      if (error.message.includes('不存在') || error.message.includes('无权')) {
        return ResponseUtil.notFound(res, error.message);
      }
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 创建模板
   */
  static async create(req, res) {
    try {
      const template = await NotificationTemplateService.create(req.user.id, req.body);
      return ResponseUtil.created(res, template);
    } catch (error) {
      logger.error('创建模板失败:', error);
      if (error.message.includes('不能为空')) {
        return ResponseUtil.badRequest(res, error.message);
      }
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 更新模板
   */
  static async update(req, res) {
    try {
      const template = await NotificationTemplateService.update(
        req.params.id,
        req.user.id,
        req.body
      );
      return ResponseUtil.success(res, template);
    } catch (error) {
      logger.error('更新模板失败:', error);
      if (error.message.includes('不存在') || error.message.includes('无权')) {
        return ResponseUtil.notFound(res, error.message);
      }
      return ResponseUtil.serverError(res, error.message);
    }
  }

  /**
   * 删除模板
   */
  static async delete(req, res) {
    try {
      const result = await NotificationTemplateService.delete(req.params.id, req.user.id);
      return ResponseUtil.success(res, result);
    } catch (error) {
      logger.error('删除模板失败:', error);
      if (error.message.includes('不存在') || error.message.includes('无权')) {
        return ResponseUtil.notFound(res, error.message);
      }
      return ResponseUtil.serverError(res, error.message);
    }
  }
}

module.exports = NotificationTemplateController;
```

**Controller 编写规范：**
- 类名使用 PascalCase + `Controller` 后缀：`XxxController`
- 所有方法使用 `static async`（即使 Service 是同步的）
- **每个方法都必须用 try/catch 包裹**
- 成功用 `ResponseUtil.success()` / `ResponseUtil.created()`
- 业务错误用 `ResponseUtil.badRequest()` / `ResponseUtil.notFound()`
- 异常用 `ResponseUtil.serverError()`

### 1.4 创建 Route

文件：`apps/server/src/routes/notificationTemplate.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authMiddleware = require('../middleware/auth.middleware');
const validatorMiddleware = require('../middleware/validator.middleware');
const NotificationTemplateController = require('../controllers/notificationTemplate.controller');

// 需要认证
router.use(authMiddleware);

// 验证规则
const createValidation = [
  body('name').trim().notEmpty().withMessage('模板名称不能为空'),
  validatorMiddleware.validate,
];

// 路由定义
router.get('/', NotificationTemplateController.list);
router.post('/', createValidation, NotificationTemplateController.create);
router.get('/:id', NotificationTemplateController.detail);
router.put('/:id', createValidation, NotificationTemplateController.update);
router.delete('/:id', NotificationTemplateController.delete);

module.exports = router;
```

**Route 编写规范：**
- 文件名 `{资源名}.routes.js`
- 使用 `express.Router()` 创建子路由
- 认证中间件放在 `router.use()` 中（所有路由都需要时）
- 参数验证规则定义在路由级别
- 最后 `module.exports = router`

### 1.5 注册路由

#### 方式一：顶层注册（独立功能模块）

修改 `apps/server/src/routes/index.js`：

```javascript
// 顶部引入
const notificationTemplateRoutes = require('./notificationTemplate.routes');

// 在 app 上注册
app.use('/api/templates', notificationTemplateRoutes);
```

#### 方式二：子路由挂载（渠道专属功能）

对于需要特殊绑定流程的渠道（如扫码登录），应在主渠道路由中挂载子路由：

```javascript
// apps/server/src/routes/channel.routes.js

// 微信龙虾机器人绑定路由（必须在 /:id 之前，避免路径冲突）
const clawbotRoutes = require('./clawbot.routes');
router.use('/clawbot', clawbotRoutes);

// 小爱音箱扫码登录路由
const misoundRoutes = require('./misound.routes');
router.use('/misound', misoundRoutes);
```

**子路由文件示例：**

```javascript
// apps/server/src/routes/misound.routes.js
const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const validatorMiddleware = require('../middleware/validator.middleware');
const misoundController = require('../controllers/misound.controller');

// 所有小爱音箱路由都需要认证
router.use(authMiddleware);

// 初始化扫码登录
router.post('/qr/init', misoundController.initQRLogin);

// 确认绑定 - 需要参数验证
const confirmBindValidation = [
  body('userId').trim().notEmpty().withMessage('userId 不能为空'),
  validatorMiddleware.validate,
];
router.post('/qr/confirm', confirmBindValidation, misoundController.confirmBind);

module.exports = router;
```

**注意事项：**
- 子路由必须在 `/:id` 等通配符路由之前挂载，避免路径冲突
- 每个子路由文件应包含自己的认证和参数验证逻辑

---

## 2. 新增中间件

文件：`apps/server/src/middleware/xxx.middleware.js`

```javascript
const logger = require('../utils/logger');

/**
 * 示例中间件：请求日志记录
 */
const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();

  // 响应完成后记录耗时
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

module.exports = requestLoggerMiddleware;
```

**中间件编写规范：**
- 文件名 `{功能名}.middleware.js`
- 导出一个函数 `(req, res, next) => {}`
- 必须调用 `next()` 将控制权传递给下一个中间件
- 全局中间件在 `apps/server/src/app.js` 中注册
- 路由级中间件在 routes 文件中使用

---

## 3. 添加数据库迁移

在 `apps/server/src/database/init.js` 的末尾追加：

```javascript
// ========== 迁移：通知模板表 ==========
db.exec(`
  CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title_template TEXT DEFAULT '',
    content_template TEXT DEFAULT '',
    created_at DATETIME DEFAULT (datetime('now')),
    updated_at DATETIME DEFAULT (datetime('now'))
  )
`);

// 增量迁移示例：后续添加字段
try {
  db.exec(`ALTER TABLE notification_templates ADD COLUMN is_active INTEGER DEFAULT 1`);
} catch (e) {
  // 字段已存在，忽略
}
```

**迁移原则：**
- 建表用 `CREATE TABLE IF NOT EXISTS`
- 加字段用 try-catch 包裹的 `ALTER TABLE`
- 新字段带默认值
- 不做破坏性变更

---

## 4. 添加新的 API 端点（非 CRUD）

对于不属于标准 CRUD 的特殊接口（如导出、统计等），直接在对应的 Controller/Service 中添加方法即可。

```javascript
// Controller 中添加
static async export(req, res) {
  try {
    const templates = await NotificationTemplateService.exportByUser(req.user.id);
    res.setHeader('Content-Type', 'application/json');
    res.attachment('templates.json');
    return res.send(JSON.stringify(templates, null, 2));
  } catch (error) {
    return ResponseUtil.serverError(res, error.message);
  }
}

// Route 中注册
router.get('/export', NotificationTemplateController.export);
```
