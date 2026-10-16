const crypto = require('crypto');

/**
 * 请求关联 ID 中间件
 *
 * 为每个进入的请求生成（或复用客户端通过 X-Request-Id 传入的）唯一 requestId，
 * 写入 req.requestId，并通过响应头 X-Request-Id 回传给客户端。
 * 同时推送日志会记录该 requestId，从而把「请求日志」与「推送日志」关联起来，
 * 便于按一次请求串联排查问题。
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.trim()
      ? incoming.trim()
      : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

module.exports = requestIdMiddleware;
