const fs = require('fs');
const path = require('path');

/**
 * 版本配置管理
 * 从 version.json 读取版本信息，确保版本号统一管理
 */

const versionPath = path.resolve(__dirname, '../../../version.json');

let versionCache = null;

function loadVersion() {
  if (versionCache) {
    return versionCache;
  }

  try {
    const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
    versionCache = {
      version: versionData.version,
      displayName: versionData.displayName,
      description: versionData.description,
      name: versionData.name,
      changelog: versionData.changelog || [],
    };
    return versionCache;
  } catch (error) {
    console.error('Failed to load version.json:', error);
    return {
      version: '1.0.0',
      displayName: 'MagicPush',
      description: 'MagicPush 推送服务系统',
      name: 'magicpush',
      changelog: [],
    };
  }
}

/**
 * 获取版本号
 */
function getVersion() {
  return loadVersion().version;
}

/**
 * 获取显示名称
 */
function getDisplayName() {
  return loadVersion().displayName;
}

/**
 * 获取完整版本信息
 */
function getVersionInfo() {
  return loadVersion();
}

/**
 * 获取版本号的主要部分（主版本.次版本）
 */
function getShortVersion() {
  const version = getVersion();
  const parts = version.split('.');
  return `${parts[0]}.${parts[1]}`;
}

module.exports = {
  getVersion,
  getDisplayName,
  getVersionInfo,
  getShortVersion,
};
