const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');

// 所有用户路由都需要认证
router.use(authMiddleware);

// 获取当前用户信息
router.get('/me', userController.getCurrentUser);

// 更新当前用户信息
router.put('/me', userController.updateCurrentUser);

// 修改密码
router.put('/me/password', userController.changePassword);

// 导出用户配置（必须在 /me/stats 之前定义）
router.get('/me/export', userController.exportConfig);

// 导入用户配置（必须在 /me/stats 之前定义）
router.post('/me/import', userController.importConfig);

// 获取用户统计信息
router.get('/me/stats', userController.getUserStats);

// 获取注册设置（管理员接口）
router.get('/me/settings/registration', userController.checkAdmin, userController.getRegistrationSetting);

// 更新注册设置（管理员接口）
router.put('/me/settings/registration', userController.checkAdmin, userController.updateRegistrationSetting);

module.exports = router;
