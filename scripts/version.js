#!/usr/bin/env node

/**
 * 版本管理脚本
 * 用于统一管理项目版本号
 *
 * 用法:
 *   node scripts/version.js                # 查看当前版本
 *   node scripts/version.js patch         # 更新补丁版本 (1.0.0 -> 1.0.1)
 *   node scripts/version.js minor         # 更新次版本 (1.0.0 -> 1.1.0)
 *   node scripts/version.js major         # 更新主版本 (1.0.0 -> 2.0.0)
 *   node scripts/version.js set 1.2.3     # 设置特定版本
 */

const fs = require('fs');
const path = require('path');

const versionFile = path.resolve(__dirname, '../version.json');
const serverPackage = path.resolve(__dirname, '../server/package.json');
const webPackage = path.resolve(__dirname, '../web/package.json');

/**
 * 读取 version.json
 */
function loadVersion() {
  return JSON.parse(fs.readFileSync(versionFile, 'utf-8'));
}

/**
 * 保存 version.json
 */
function saveVersion(data) {
  fs.writeFileSync(versionFile, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * 读取 package.json
 */
function loadPackage(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 保存 package.json
 */
function savePackage(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

/**
 * 解析版本号
 */
function parseVersion(version) {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/**
 * 格式化版本号
 */
function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

/**
 * 更新版本号
 */
function bumpVersion(type, currentVersion) {
  const v = parseVersion(currentVersion);

  switch (type) {
    case 'major':
      v.major++;
      v.minor = 0;
      v.patch = 0;
      break;
    case 'minor':
      v.minor++;
      v.patch = 0;
      break;
    case 'patch':
      v.patch++;
      break;
    default:
      throw new Error(`Invalid version type: ${type}`);
  }

  return formatVersion(v);
}

/**
 * 同步版本号到所有文件
 */
function syncVersion(newVersion, changes = []) {
  console.log(`\n📦 更新版本号到: ${newVersion}\n`);

  // 1. 更新 version.json
  const versionData = loadVersion();
  versionData.version = newVersion;

  // 添加到 changelog
  if (changes.length > 0) {
    const newEntry = {
      version: newVersion,
      date: new Date().toISOString().split('T')[0],
      type: 'release',
      changes: changes,
    };
    versionData.changelog.unshift(newEntry);
  }

  saveVersion(versionData);
  console.log('✅ 更新 version.json');

  // 2. 更新 server/package.json
  const serverPkg = loadPackage(serverPackage);
  serverPkg.version = newVersion;
  savePackage(serverPackage, serverPkg);
  console.log('✅ 更新 server/package.json');

  // 3. 更新 web/package.json
  const webPkg = loadPackage(webPackage);
  webPkg.version = newVersion;
  savePackage(webPackage, webPkg);
  console.log('✅ 更新 web/package.json');

  // 4. 更新 web/src/utils/version.js
  const versionUtilsPath = path.resolve(__dirname, '../web/src/utils/version.js');
  if (fs.existsSync(versionUtilsPath)) {
    let content = fs.readFileSync(versionUtilsPath, 'utf-8');
    content = content.replace(/version:\s*'[^']*'/, `version: '${newVersion}'`);
    fs.writeFileSync(versionUtilsPath, content, 'utf-8');
    console.log('✅ 更新 web/src/utils/version.js');
  }

  console.log('\n🎉 版本号更新完成！');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const versionData = loadVersion();
  const currentVersion = versionData.version;

  if (!command || command === 'show' || command === 'current') {
    console.log('\n📌 当前版本信息:');
    console.log(`   名称: ${versionData.displayName}`);
    console.log(`   版本: ${currentVersion}`);
    console.log(`   描述: ${versionData.description}`);
    console.log('\n📝 最近更新:');
    if (versionData.changelog && versionData.changelog.length > 0) {
      const latest = versionData.changelog[0];
      console.log(`   ${latest.version} (${latest.date})`);
      latest.changes.forEach(change => {
        console.log(`   - ${change}`);
      });
    }
    console.log('');
    return;
  }

  if (command === 'patch' || command === 'minor' || command === 'major') {
    const changes = args.slice(1);
    const newVersion = bumpVersion(command, currentVersion);
    syncVersion(newVersion, changes);
    return;
  }

  if (command === 'set') {
    const newVersion = args[1];
    if (!newVersion || !/^\d+\.\d+\.\d+$/.test(newVersion)) {
      console.error('❌ 无效的版本号格式，请使用: major.minor.patch (例如: 1.2.3)');
      process.exit(1);
    }
    const changes = args.slice(2);
    syncVersion(newVersion, changes);
    return;
  }

  if (command === 'changelog') {
    console.log('\n📜 版本更新记录:\n');
    if (versionData.changelog && versionData.changelog.length > 0) {
      versionData.changelog.forEach(entry => {
        console.log(`🔖 ${entry.version} (${entry.date})`);
        entry.changes.forEach(change => {
          console.log(`   ${change}`);
        });
        console.log('');
      });
    } else {
      console.log('   暂无更新记录\n');
    }
    return;
  }

  console.error(`
❌ 未知命令: ${command}

用法:
  node scripts/version.js                # 查看当前版本
  node scripts/version.js patch         # 更新补丁版本 (1.0.0 -> 1.0.1)
  node scripts/version.js minor         # 更新次版本 (1.0.0 -> 1.1.0)
  node scripts/version.js major         # 更新主版本 (1.0.0 -> 2.0.0)
  node scripts/version.js set 1.2.3     # 设置特定版本
  node scripts/version.js changelog     # 查看更新记录

示例:
  node scripts/version.js patch "修复登录bug" "优化性能"
  node scripts/version.js minor "新增Webhook支持"
  node scripts/version.js major "重构认证系统"
  `);
  process.exit(1);
}

// 运行
if (require.main === module) {
  main();
}

module.exports = {
  loadVersion,
  saveVersion,
  syncVersion,
  bumpVersion,
};
