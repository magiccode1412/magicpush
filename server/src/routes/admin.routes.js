const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const UserController = require('../controllers/user.controller');

// 所有路由都需要管理员权限
router.use(UserController.checkAdmin);

// 用户管理
router.get('/users', AdminController.getUsers);
router.post('/users', AdminController.createUser);
router.put('/users/:id', AdminController.updateUser);
router.delete('/users/:id', AdminController.deleteUser);
router.put('/users/:id/password', AdminController.resetPassword);

module.exports = router;
