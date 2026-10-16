/**
 * 简单的 JSONPath 解析工具
 * 支持基本的 JSONPath 语法，用于字段映射
 */

/**
 * 从对象中根据路径获取值
 * @param {Object} obj - 源对象
 * @param {String} path - JSONPath 路径，如 $.alerts[0].labels.alertname 或 $[0].Title
 * @returns {any} - 找到的值，如果不存在则返回 undefined
 */
function getValue(obj, path) {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  // 如果不是以 $ 开头，直接作为属性名处理
  if (!path.startsWith('$')) {
    return obj[path];
  }

  let current = path.slice(1); // 移除 $ 前缀
  let value = obj;

  // 解析路径
  while (current && value !== null && value !== undefined) {
    // 匹配属性名或数组索引
    const match = current.match(/^\.?([^.[\]]+)|^\[(\d+)\]/);
    
    if (!match) {
      break;
    }

    if (match[1] !== undefined) {
      // 属性访问
      value = value[match[1]];
      current = current.slice(match[0].length);
    } else if (match[2] !== undefined) {
      // 数组索引
      const index = parseInt(match[2], 10);
      if (Array.isArray(value)) {
        value = value[index];
      } else {
        value = undefined;
      }
      current = current.slice(match[0].length);
    }
  }

  return value;
}

/**
 * 根据映射规则从源数据提取字段
 * @param {Object} source - 源数据
 * @param {Object} mapping - 映射规则，如 { title: '$.alerts[0].labels.alertname' }
 * @param {Object} defaults - 默认值，如 { type: 'text' }
 * @returns {Object} - 提取后的对象 { title, content, type }
 */
// 解析字面量中的转义字符（如 \n \t \\）
function unescapeLiteral(str) {
  return String(str)
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

/**
 * 递归解析 JSON 模板中的 $.xxx 占位符
 * - 字符串且以 $. 开头 → 视为 JSONPath，从 payload 提取值；找不到返回 null（保留键）
 * - 字符串且不 $. 开头 → 原样保留
 * - 对象/数组 → 递归处理
 * - 其他类型 → 原样保留
 * @param {any} node - 模板节点
 * @param {Object} source - 源数据（payload）
 * @returns {any} - 解析后的模板
 */
function resolveTemplate(node, source) {
  if (Array.isArray(node)) {
    return node.map((item) => resolveTemplate(item, source));
  }
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = resolveTemplate(v, source);
    }
    return out;
  }
  if (typeof node === 'string') {
    const trimmed = node.trim();
    if (trimmed.startsWith('$.')) {
      const value = getValue(source, trimmed);
      return value !== undefined ? value : null;
    }
    return node;
  }
  return node;
}

function extractFields(source, mapping, defaults = {}) {
  const result = {};

  // 处理映射规则
  if (mapping) {
    for (const [field, path] of Object.entries(mapping)) {
      // 兼容 string 和 array 两种格式
      const paths = Array.isArray(path) ? path : [path];

      // extraData 为单份 JSON 模板：静态部分原样保留，$.xxx 占位符从 payload 解析
      if (field === 'extraData') {
        const raw = paths[0];
        if (raw === '' || raw === null || raw === undefined) continue;
        let template;
        if (typeof raw === 'string') {
          const trimmed = raw.trim();
          if (trimmed === '') continue;
          try {
            template = JSON.parse(trimmed);
          } catch {
            // 非法 JSON：作为普通字符串字面量保留
            template = unescapeLiteral(trimmed);
          }
        } else if (raw && typeof raw === 'object') {
          template = raw;
        } else {
          continue;
        }
        result.extraData = resolveTemplate(template, source);
        continue;
      }

      if (paths.length === 1 && typeof paths[0] === 'string' && !paths[0].startsWith('$.')) {
        // 单个固定值（向后兼容）
        result[field] = unescapeLiteral(paths[0]);
      } else {
        // 混合模式：JSONPath 提取 + 字面量拼接
        const values = [];
        for (const p of paths) {
          if (typeof p === 'string' && p.startsWith('$.')) {
            // JSONPath → 从 payload 提取动态值
            const value = getValue(source, p);
            if (value !== undefined && value !== null) {
              values.push(String(value));
            }
          } else if (p !== '' && p !== null && p !== undefined) {
            // 非 $ 开头 → 解析转义后作为字面量
            values.push(unescapeLiteral(p));
          }
        }
        if (values.length > 0) {
          result[field] = values.join('');
        }
      }
    }
  }

  // 应用默认值
  for (const [field, value] of Object.entries(defaults || {})) {
    if (result[field] === undefined) {
      result[field] = value;
    }
  }

  return result;
}

/**
 * 预设模板配置
 */
const PRESET_TEMPLATES = {
  grafana: {
    name: 'Grafana',
    description: 'Grafana 告警消息',
    fieldMapping: {
      title: '$.alerts[0].labels.alertname',
      content: '$.alerts[0].annotations.message',
    },
    defaultValues: {
      type: 'text',
    },
  },
  prometheus: {
    name: 'Prometheus AlertManager',
    description: 'AlertManager 告警消息',
    fieldMapping: {
      title: '$.alerts[0].labels.alertname',
      content: '$.alerts[0].annotations.description',
    },
    defaultValues: {
      type: 'text',
    },
  },
  github: {
    name: 'GitHub Webhook',
    description: 'GitHub 事件通知',
    fieldMapping: {
      title: '$.action',
      content: '$.repository.full_name',
    },
    defaultValues: {
      type: 'text',
    },
  },
  emby: {
    name: 'Emby',
    description: 'Emby 媒体库通知',
    fieldMapping: {
      title: '$.Title',
      content: '$.Description',
    },
    defaultValues: {
      type: 'text',
    },
  },
  generic: {
    name: '通用',
    description: '自定义映射规则',
    fieldMapping: {},
    defaultValues: {
      title: '新消息',
      type: 'text',
    },
  },
};

/**
 * 获取预设模板
 * @param {String} type - 模板类型
 * @returns {Object|null} - 模板配置
 */
function getPresetTemplate(type) {
  return PRESET_TEMPLATES[type] || null;
}

/**
 * 获取所有预设模板
 * @returns {Array} - 模板列表
 */
function getAllPresetTemplates() {
  return Object.entries(PRESET_TEMPLATES).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.description,
  }));
}

module.exports = {
  getValue,
  extractFields,
  getPresetTemplate,
  getAllPresetTemplates,
  PRESET_TEMPLATES,
};
