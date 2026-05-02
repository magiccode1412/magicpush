# 接口管理 - 关键词过滤功能实现计划

## 一、功能概述

在接口（Endpoint）层面增加关键词过滤功能，支持**白名单**和**黑名单**两种过滤模式：

- **黑名单模式**（默认）：消息包含任一关键词则**拒绝发送**，返回"包含不合法内容"
- **白名单模式**：消息必须包含至少一个关键词才**允许发送**，否则拒绝

## 二、整体设计

### 2.1 过滤插入点

```
消息进入 → 获取 Endpoint → 检查 is_active → [关键词过滤] → 推送到渠道
                                              ↓ 命中黑名单 / 未命中白名单
                                        返回 400 "包含不合法内容"
```

- **过滤粒度**：按 Endpoint 级别配置，每个接口独立设置
- **检查范围**：同时检查 `title` + `content`，任一字段命中即触发规则
- **匹配规则**：大小写不敏感、支持多关键词（任一命中即拦截/放行）

### 2.2 数据结构

```javascript
// endpoints 表新增字段 keyword_filter (TEXT, JSON)
// null = 未启用（不过滤）

keyword_filter: {
  enabled: true,                    // 是否启用
  mode: 'blacklist',                // 'blacklist'(黑名单, 默认) | 'whitelist'(白名单)
  keywords: ['广告', '赌博', '违禁词']   // 关键词列表
}
```

## 三、涉及文件与改动清单

| # | 文件路径 | 改动类型 | 说明 |
|---|---------|---------|------|
| 1 | `server/src/database/init.js` | **修改** | endpoints 表增加 `keyword_filter TEXT` 列 |
| 2 | `server/src/models/endpoint.model.js` | **修改** | 所有查询方法解析 `keyword_filter` JSON；update 支持写入；新增 `updateKeywordFilter` 方法 |
| 3 | **`server/src/services/keywordFilter.service.js`** | **新建** | 关键词过滤核心逻辑（check 方法） |
| 4 | `server/src/services/push.service.js` | **修改** | `pushByToken()` / `pushByEndpoint()` 中推送前插入过滤调用 |
| 5 | `server/src/controllers/endpoint.controller.js` | **修改** | 新增 `updateKeywordFilter` 控制器方法 + 校验逻辑 |
| 6 | `server/src/routes/endpoint.routes.js` | **修改** | 新增 `PUT /:id/keyword-filter` 路由及校验中间件 |
| 7 | `web/src/api/endpoint.js` | **修改** | 新增 `updateKeywordFilter(id, config)` API 封装 |
| 8 | `web/src/views/endpoints/List.vue` | **修改** | 卡片显示过滤状态标签 + 下拉菜单新增入口 + 新增编辑抽屉 |

## 四、详细实现方案

### 4.1 数据库层 — database/init.js

```sql
-- endpoints 表新增 keyword_filter 列
ALTER TABLE endpoints ADD COLUMN keyword_filter TEXT DEFAULT NULL;
```

- 使用 `ALTER TABLE` 兼容已有数据（NULL 表示未配置）
- 建议加异常处理：如果列已存在则跳过（幂等执行）

### 4.2 模型层 — endpoint.model.js

**解析逻辑**（复用 inbound_config 的模式）：
- 在 `findById()` / `findByToken()` / `findByUserId()` 中增加对 `keyword_filter` 的 `JSON.parse` 解析
- 解析失败时回退为 `null`

**update() 方法增强**：
- 动态拼接 SQL 时支持 `keyword_filter` 字段
- 存储时使用 `JSON.stringify(filterConfig)`

**新增方法**：
```javascript
static updateKeywordFilter(endpointId, filterConfig) {
  const stmt = db.prepare(
    "UPDATE endpoints SET keyword_filter = ?, updated_at = datetime('now', 'localtime') WHERE id = ?"
  );
  stmt.run(
    filterConfig ? JSON.stringify(filterConfig) : null,
    endpointId
  );
  return this.findById(endpointId);
}
```

### 4.3 过滤服务 — 新建 keywordFilter.service.js

```javascript
class KeywordFilterService {
  /**
   * 检查消息是否通过关键词过滤
   * @param {Object|null} filterConfig - endpoint 的 keyword_filter 配置
   * @param {{ title?, content? }} message - 待检查的消息
   * @returns {{ blocked: boolean, mode?: string, matchedKeyword?: string }}
   */
  static check(filterConfig, message) {
    // 未配置或未启用 → 直接放行
    if (!filterConfig?.enabled || !filterConfig.keywords?.length) {
      return { blocked: false };
    }

    const { mode = 'blacklist', keywords } = filterConfig;
    // 拼接标题和内容，统一转小写做匹配
    const text = `${message.title || ''} ${message.content || ''}`.toLowerCase();

    for (const keyword of keywords) {
      if (!keyword.trim()) continue; // 跳过空关键词
      if (text.includes(keyword.trim().toLowerCase())) {
        return {
          blocked: mode === 'blacklist', // 黑名单命中→拦截
          mode,
          matchedKeyword: keyword,
        };
      }
    }

    // 无任何命中的情况
    return {
      blocked: mode === 'whitelist', // 白名单未命中任何一个→拦截
      mode,
    };
  }
}
```

### 4.4 推送服务 — push.service.js

在以下两个方法的**获取 endpoint 之后、调用 pushToChannels 之前**插入过滤调用：

#### pushByToken() （约第22行之后）
```javascript
static async pushByToken(token, message, clientIp) {
  const endpoint = await EndpointModel.findByToken(token);
  if (!endpoint) throw new Error('无效的接口令牌');
  if (!endpoint.is_active) throw new Error('接口已禁用');

  // ★ 新增：关键词过滤
  const filterResult = KeywordFilterService.check(endpoint.keyword_filter, message);
  if (filterResult.blocked) {
    logger.warn(`关键词过滤拦截 - 接口:${endpoint.id} IP:${clientIp} 模式:${filterResult.mode} 命中词:${filterResult.matchedKeyword || '(无)'}`);
    throw new Error('包含不合法内容');
  }

  await EndpointModel.updateLastUsed(endpoint.id);
  // ... 后续不变
}
```

#### pushByEndpoint() （约第44行之后）
```javascript
static async pushByEndpoint(endpointId, userId, message, clientIp) {
  const endpoint = await EndpointModel.findById(endpointId);
  // ... 校验逻辑不变 ...

  // ★ 新增：关键词过滤
  const filterResult = KeywordFilterService.check(endpoint.keyword_filter, message);
  if (filterResult.blocked) {
    logger.warn(`关键词过滤拦截 - 接口:${endpoint.id} IP:${clientIp}`);
    throw new Error('包含不合法内容');
  }
  // ... 后续不变
}
```

> 注意：`pushByChannel()`（按渠道ID推送）不经过此过滤——该路径无 endpoint 上下文。

### 4.5 控制器层 — endpoint.controller.js

新增控制器方法：

```javascript
/**
 * 更新关键词过滤配置
 */
static async updateKeywordFilter(req, res) {
  try {
    const { id } = req.params;
    const { enabled, mode, keywords } = req.body;

    // 校验参数
    let config = null;

    if (enabled) {
      // 启用时校验必要字段
      if (!mode || !['blacklist', 'whitelist'].includes(mode)) {
        return ResponseUtil.badRequest(res, '过滤模式必须是 blacklist 或 whitelist');
      }
      if (!Array.isArray(keywords) || keywords.length === 0 || keywords.length > 50) {
        return ResponseUtil.badRequest(res, '关键词数量为 1~50 个');
      }
      for (const kw of keywords) {
        if (typeof kw !== 'string' || kw.trim().length === 0 || kw.length > 50) {
          return ResponseUtil.badRequest(res, '每个关键词为 1~50 个字符');
        }
      }
      config = {
        enabled: true,
        mode,
        keywords: keywords.map(k => k.trim()).filter(k => k),
      };
    }

    const endpoint = await EndpointModel.updateKeywordFilter(id, config);
    if (!endpoint) {
      return ResponseUtil.notFound(res, '接口不存在');
    }

    logger.info(`管理员/用户 更新接口 ${id} 关键词过滤配置`);
    return ResponseUtil.success(res, { keyword_filter: config }, '关键词过滤配置已更新');

  } catch (error) {
    logger.error('更新关键词过滤失败:', error);
    return ResponseUtil.serverError(res, error.message || '更新失败');
  }
}
```

### 4.6 路由层 — endpoint.routes.js

```javascript
// 关键词过滤配置（放在 CRUD 路由组内，需要认证）
router.put('/:id/keyword-filter',
  // 可选：添加参数校验中间件
  EndpointController.updateKeywordFilter
);
```

### 4.7 前端 API — endpoint.js

```javascript
// 新增
export const updateKeywordFilter = (id, data) => {
  return request.put(`/endpoints/${id}/keyword-filter`, data)
}
```

### 4.8 前端 UI — List.vue

#### 4.8.1 卡片区域改动

在"入站配置状态"区块下方、"统计"区块上方，新增关键词过滤状态行：

```html
<!-- 关键词过滤状态 -->
<div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <Shield class="w-4 h-4 text-gray-400" />
      <span class="text-xs text-gray-500 dark:text-gray-400">关键词过滤</span>
    </div>
    <el-button text size="small" @click="openKeywordFilter(endpoint)">
      <span v-if="endpoint.keyword_filter?.enabled"
            :class="endpoint.keyword_filter.mode === 'blacklist' ? 'text-orange-500' : 'text-blue-500'">
        {{ endpoint.keyword_filter.mode === 'blacklist' ? '黑名单模式' : '白名单模式' }}
      </span>
      <span v-else class="text-gray-400">未配置</span>
    </el-button>
  </div>
</div>
```

#### 4.8.2 下拉菜单新增选项

在"编辑"、"重新生成令牌"之后、"删除"之前：

```html
<el-dropdown-item command="keywordFilter">
  <Shield class="w-4 h-4 mr-2" />
  关键词过滤
</el-dropdown-item>
```

#### 4.8.3 关键词过滤编辑抽屉

复用 `el-drawer` 组件（参考现有入站配置抽屉的模式），结构如下：

```
┌─────────────────────────────────────┐
│  关键词过滤                    [✕]  │
├─────────────────────────────────────┤
│                                     │
│  ┌─ 启用开关 ────────────────[===] │
│  │  开启后将对推送消息进行关键词过滤  │
│  └──────────────────────────────── │
│                                     │
│  ──────────── 分割线 ───────────── │
│  （仅在启用后显示以下内容）          │
│                                     │
│  ┌─ 过滤模式 ───────────────────── │
│  │  ● 黑名单（默认）                │
│  │    包含任一关键词的消息将         │
│  │    被拒绝发送                    │
│  │                                  │
│  │  ○ 白名单                        │
│  │    仅包含至少一个关键词的         │
│  │    消息才被允许发送              │
│  └──────────────────────────────── │
│                                     │
│  ┌─ 关键词列表 ─────────────────── │
│  │  ┌──────────────────────────┐  │
│  │  │ 广告                      │  │
│  │  │ 赌博                      │  │
│  │  │ 违禁                      │  │
│  │  │                          │  │
│  │  │ [+ 添加]                  │  │
│  │  └──────────────────────────┘  │
│  │  每行一个关键词，最多50个        │
│  └──────────────────────────────── │
│                                     │
│  ──────────── 分割线 ───────────── │
│                                     │
│  ⚠️ 黑名单说明：                     │
│     当消息标题或内容包含列表中       │
│     任一关键词时，消息将被拒绝，     │
│     并返回"包含不合法内容"错误       │
│                                     │
│  💡 白名单说明：                     │
│     当消息标题或内容未包含列表中     │
│     任何关键词时，消息将被拒绝。     │
│     仅当包含至少一个关键词时才放行   │
│                                     │
│              [取消]  [保存]         │
└─────────────────────────────────────┘
```

表单数据结构：
```javascript
const keywordForm = reactive({
  enabled: false,
  mode: 'blacklist',     // 'blacklist' | 'whitelist'
  keywords: [],          // string[]
})
```

关键方法：
- `openKeywordFilter(endpoint)` — 打开抽屉，回填已有配置
- `saveKeywordFilter()` — 调用 `updateKeywordFilter` API 保存

## 五、数据流时序图

```
前端                          后端
│                              │
│── POST /api/push/{token} ──>│
│   body: { title, content }  │
│                              │
│                              ├── push.controller.pushByToken()
│                              │   提取 title, content, type, url
│                              │
│                              ├── push.service.pushByToken()
│                              │   findByToken(token) → endpoint
│                              │   ✗ endpoint 不存在 → 抛错
│                              │   ✗ !is_active → 抛错
│                              │
│                              │   ★ KeywordFilterService.check()
│                              │     ├─ 读取 endpoint.keyword_filter
│                              │     ├─ null 或 enabled=false → 放行
│                              │     ├─ 拼接 text = title+content (小写)
│                              │     ├─ 遍历 keywords 逐一匹配
│                              │     │
│                              │     ├─ blacklist + 命中 → blocked=true
│                              │     └─ whitelist + 全未命中 → blocked=true
│                              │           │
│<═══ 400 包含不合法内容 ═══════│ (blocked)
│                              │
│                              │ (passed)
│                              │   updateLastUsed()
│                              │   getChannels()
│                              │   pushToChannels() → 各渠道适配器
│                              │
│<═══ 200 推送成功 ════════════│
```

**入站 Webhook 路径同样经过过滤**：
```
外部系统 → POST /api/inbound/{token}
  → loadEndpoint 中间件 (加载 endpoint)
  → inbound.controller.handleInbound()
  → inbound.service.processInbound()  (转换 payload → 标准化 {title, content, type})
  → push.service.pushByToken()  ★ 这里会经过关键词过滤
  → pushToChannels() → 渠道发送
```

## 六、边界情况处理

| 场景 | 处理方式 |
|------|---------|
| `keyword_filter` 为 NULL | 不过滤，直接放行 |
| `enabled: false` | 不过滤，直接放行 |
| `keywords` 为空数组 `[]` | 视为无效配置，不过滤（等价于 enabled=false） |
| 消息 title 和 content 都为空字符串 | 无法匹配任何关键词；黑名单模式放行，白名单模式拦截 |
| 关键词包含空字符串或纯空白 | `trim()` 后跳过该词，不计入有效关键词 |
| 单个关键词超过 50 字符 | 前端限制输入长度，后端校验返回 400 |
| 关键词总数超过 50 个 | 前端提示上限，后端校验返回 400 |
| `pushByChannel` (按渠道ID推送) | **不过滤** — 该路径无 endpoint 上下文 |
| 大小写混合 | 统一转小写后匹配（如 "Ad" 能命中 "ad"） |
| 关键词是其他词的子串 | 使用 `includes()` 子串匹配，自然支持 |

## 七、工作量评估

| 模块 | 预估代码量 | 说明 |
|------|-----------|------|
| 数据库迁移 | ~10 行 | ALTER TABLE 语句 |
| Model 层修改 | ~40 行 | 解析 + 写入 + 新方法 |
| KeywordFilter 服务（新建） | ~45 行 | 核心 check 逻辑 |
| Push Service 修改 | ~20 行 | 两处插入过滤调用 |
| Controller + Route | ~60 行 | 新方法 + 路由 + 校验 |
| 前端 API | ~3 行 | 封装函数 |
| 前端 UI | ~200 行 | 卡片状态 + 抽屉组件 + 表单逻辑 |
| **合计** | **~378 行** | 涉及 8 个文件（1 个新建 + 7 个修改） |
