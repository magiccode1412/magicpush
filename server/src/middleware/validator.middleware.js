const { validationResult, body, param, query } = require('express-validator');
const ResponseUtil = require('../utils/response');

/**
 * 验证错误处理中间件
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => error.msg);
    return ResponseUtil.badRequest(res, errorMessages.join(', '));
  }
  next();
};

/**
 * 用户注册验证规则
 */
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('用户名长度必须在3-20个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少为6个字符'),
  handleValidationErrors,
];

/**
 * 用户登录验证规则
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('邮箱不能为空'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
  handleValidationErrors,
];

/**
 * 刷新令牌验证规则
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('刷新令牌不能为空'),
  handleValidationErrors,
];

/**
 * 创建渠道验证规则
 */
const createChannelValidation = [
  body('channelType')
    .notEmpty()
    .withMessage('渠道类型不能为空')
    .isIn(['wecom', 'telegram', 'pushplus', 'wxpusher', 'feishu', 'dingtalk', 'webhook', 'wechat_official', 'serverchan', 'smtp'])
    .withMessage('不支持的渠道类型'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('渠道名称不能为空')
    .isLength({ max: 50 })
    .withMessage('渠道名称不能超过50个字符'),
  body('config')
    .isObject()
    .withMessage('配置必须是对象'),
  handleValidationErrors,
];

/**
 * 更新渠道验证规则
 */
const updateChannelValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('渠道ID必须是正整数'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('渠道名称不能超过50个字符'),
  body('config')
    .optional()
    .isObject()
    .withMessage('配置必须是对象'),
  handleValidationErrors,
];

/**
 * 创建接口验证规则
 */
const createEndpointValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('接口名称不能为空')
    .isLength({ max: 50 })
    .withMessage('接口名称不能超过50个字符'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('接口描述不能超过200个字符'),
  handleValidationErrors,
];

/**
 * 更新接口验证规则
 */
const updateEndpointValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('接口ID必须是正整数'),
  body('name')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('接口名称不能超过50个字符'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('接口描述不能超过200个字符'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('状态必须是布尔值'),
  body('token')
    .optional()
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage('令牌长度必须在6-100个字符之间'),
  handleValidationErrors,
];

/**
 * 验证令牌规则
 */
const validateTokenValidation = [
  body('token')
    .notEmpty()
    .withMessage('令牌不能为空')
    .trim()
    .isLength({ min: 6, max: 100 })
    .withMessage('令牌长度必须在6-100个字符之间'),
  handleValidationErrors,
];

/**
 * 推送消息验证规则
 */
const pushMessageValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('标题不能超过200个字符'),
  body('content')
    .notEmpty()
    .withMessage('消息内容不能为空')
    .isLength({ max: 5000 })
    .withMessage('消息内容不能超过5000个字符'),
  body('type')
    .optional()
    .isIn(['text', 'markdown', 'html'])
    .withMessage('消息类型必须是text、markdown或html'),
  handleValidationErrors,
];

/**
 * 分页查询验证规则
 */
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('pageSize')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页数量必须在1-100之间'),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  createChannelValidation,
  updateChannelValidation,
  createEndpointValidation,
  updateEndpointValidation,
  validateTokenValidation,
  pushMessageValidation,
  paginationValidation,
  handleValidationErrors,
};
