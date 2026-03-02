/**
 * 统一响应格式工具
 */

class ResponseUtil {
  /**
   * 成功响应
   */
  static success(res, data = null, message = '操作成功') {
    return res.status(200).json({
      success: true,
      code: 200,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 创建成功响应
   */
  static created(res, data = null, message = '创建成功') {
    return res.status(201).json({
      success: true,
      code: 201,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 错误响应
   */
  static error(res, message = '操作失败', code = 500, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      code,
      message,
      data: null,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 参数错误响应
   */
  static badRequest(res, message = '请求参数错误') {
    return this.error(res, message, 400, 400);
  }

  /**
   * 未授权响应
   */
  static unauthorized(res, message = '未授权访问') {
    return this.error(res, message, 401, 401);
  }

  /**
   * 禁止访问响应
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, message, 403, 403);
  }

  /**
   * 资源不存在响应
   */
  static notFound(res, message = '资源不存在') {
    return this.error(res, message, 404, 404);
  }

  /**
   * 服务器错误响应
   */
  static serverError(res, message = '服务器内部错误') {
    return this.error(res, message, 500, 500);
  }
}

module.exports = ResponseUtil;
