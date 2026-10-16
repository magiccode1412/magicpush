/**
 * 从请求中提取真实客户端 IP。
 *
 * 此前该逻辑在 app.js / error.middleware.js / push.controller.js /
 * inbound.controller.js 中重复定义了 5 份，现已统一到此处。
 *
 * 优先级：
 *   1. X-Real-IP         —— 反向代理断言的单一客户端 IP（最可信）
 *   2. X-Forwarded-For   —— 取逗号分隔列表的首段（原始客户端）
 *   3. req.ip            —— Express 在 trust proxy 下解析出的 IP
 *
 * 注意：本项目 app.js 已设置 `app.set('trust proxy', 1)`，
 * 因此 req.ip 本身已是正确客户端 IP，本函数作为显式兜底。
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
function getRealIP(req) {
  const xRealIP = req.get('X-Real-IP');
  if (xRealIP) {
    return xRealIP;
  }

  const xForwardedFor = req.get('X-Forwarded-For');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  return req.ip;
}

module.exports = getRealIP;
