const express = require('express');
const router = express.Router();
const versionController = require('../controllers/version.controller');

// 获取版本信息（公开接口）
router.get('/', versionController.getVersionInfo);

module.exports = router;
