const logger = require('../utils/logger');

/**
 * 关键词过滤服务
 * 支持黑名单（命中关键词则拦截）和白名单（未命中任一关键词则拦截）
 */
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

module.exports = KeywordFilterService;
