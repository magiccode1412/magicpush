const express = require('express');
const router = express.Router();
const endpointController = require('../controllers/endpoint.controller');
const authMiddleware = require('../middleware/auth.middleware');
const {
  createEndpointValidation,
  updateEndpointValidation,
  paginationValidation,
  validateTokenValidation,
} = require('../middleware/validator.middleware');

// 所有接口路由都需要认证
router.use(authMiddleware);

// 获取接口列表
router.get('/', paginationValidation, endpointController.getEndpoints);

// 验证令牌是否可用
router.post('/validate-token', validateTokenValidation, endpointController.validateToken);

// 创建接口
router.post('/', createEndpointValidation, endpointController.createEndpoint);

// 获取单个接口
router.get('/:id', endpointController.getEndpoint);

// 更新接口
router.put('/:id', updateEndpointValidation, endpointController.updateEndpoint);

// 删除接口
router.delete('/:id', endpointController.deleteEndpoint);

// 重新生成令牌
router.post('/:id/regenerate-token', endpointController.regenerateToken);

// 更新接口渠道绑定
router.put('/:id/channels', endpointController.updateEndpointChannels);

// 获取接口渠道绑定
router.get('/:id/channels', endpointController.getEndpointChannels);

module.exports = router;
