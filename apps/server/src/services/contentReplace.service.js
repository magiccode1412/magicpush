/**
 * 内容字符替换服务
 * 对推送消息的 title / content / url / extraData 中的指定字面量进行替换。
 * 采用字面量（子串）匹配，非正则，天然规避特殊字符转义与 ReDoS 风险。
 * 约定：区分大小写；规则按数组顺序级联应用；to 为空串/undefined/null 表示删除。
 */
class ContentReplaceService {

  /**
   * 对消息内容执行字面量替换
   * @param {Object|null} config - endpoint 的 content_replace 配置
   * @param {{ title?, content?, type?, url?, extraData? }} message
   * @returns {Object} 替换后的 message（不修改原对象）
   */
  static replace(config, message) {
    if (!config?.enabled || !Array.isArray(config.rules) || config.rules.length === 0) {
      return message;
    }

    // 过滤掉无效的 from，避免空串导致全量替换
    const rules = config.rules.filter(r => r && typeof r.from === 'string' && r.from.length > 0);
    if (rules.length === 0) return message;

    const result = { ...message };
    result.title = this._applyRules(message.title, rules);
    result.content = this._applyRules(message.content, rules);
    result.url = this._applyRules(message.url, rules);
    result.extraData = this._applyRulesDeep(message.extraData, rules);
    return result;
  }

  /**
   * 对单个字符串依次应用全部规则（级联：前一条输出作为后一条输入）
   */
  static _applyRules(str, rules) {
    if (typeof str !== 'string') return str;
    let out = str;
    for (const r of rules) {
      // 区分大小写的字面量子串替换
      out = out.split(r.from).join(r.to != null ? r.to : '');
    }
    return out;
  }

  /**
   * 递归遍历对象/数组，替换所有字符串值（保持原有结构与类型）
   */
  static _applyRulesDeep(value, rules) {
    if (typeof value === 'string') return this._applyRules(value, rules);
    if (Array.isArray(value)) return value.map(v => this._applyRulesDeep(v, rules));
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = this._applyRulesDeep(v, rules);
      }
      return out;
    }
    return value;
  }
}

module.exports = ContentReplaceService;
