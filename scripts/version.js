#!/usr/bin/env node

/**
 * 版本管理脚本
 * 用于统一管理项目版本号和更新日志
 *
 * 用法:
 *   node scripts/version.js                # 查看当前版本
 *   node scripts/version.js patch         # 更新补丁版本 (1.0.0 -> 1.0.1)
 *   node scripts/version.js minor         # 更新次版本 (1.0.0 -> 1.1.0)
 *   node scripts/version.js major         # 更新主版本 (1.0.0 -> 2.0.0)
 *   node scripts/version.js set 1.2.3     # 设置特定版本
 *   node scripts/version.js changelog     # 查看更新记录（从文档站读取）
 *   node scripts/version.js export        # 导出更新日志到 CHANGELOG.md (Git 专用)
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const versionFile = path.join(rootDir, 'version.json');
const serverPackage = path.join(rootDir, 'apps/server/package.json');
const webPackage = path.join(rootDir, 'apps/web/package.json');
const webVersionUtils = path.join(rootDir, 'apps/web/src/utils/version.js');
const changelogFile = path.join(rootDir, 'apps/website/guide/changelog.md');
const gitChangelogFile = path.join(rootDir, 'CHANGELOG.md');
const fnappManifest = path.join(rootDir, 'apps/fnapp/manifest');
const dockerComposeFile = path.join(rootDir, 'apps/fnapp/app/docker/docker-compose.yaml');

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
 * 追加更新日志到 website/guide/changelog.md
 * 格式遵循文档站现有样式（带分类标题的 Markdown）
 */
function appendChangelog(version, changes) {
  if (changes.length === 0) return;

  const date = new Date().toISOString().split('T')[0];

  const entry = [
    '',
    `## [${version}] - ${date}`,
    '',
    '### 更新 (Changes)',
    ...changes.map(c => `- ${c}`),
    '',
    '---',
  ].join('\n');

  let content = '';
  if (fs.existsSync(changelogFile)) {
    content = fs.readFileSync(changelogFile, 'utf-8');
  } else {
    // 首次创建，带标题和版本说明
    content = [
      '# 更新日志 (Changelog)',
      '',
      '## 版本说明',
      '',
      '版本号遵循 [语义化版本 (Semantic Versioning)](https://semver.org/lang/zh-CN/) 规范。',
      '',
      '- **主版本号 (Major)**：不兼容的 API 修改',
      '- **次版本号 (Minor)**：向下兼容的功能性新增',
      '- **修订号 (Patch)**：向下兼容的问题修正',
      '',
    ].join('\n');
  }

  // 插入位置：在第一个版本条目之前（标题之后），保持倒序排列
  const firstEntryMatch = content.match(/^## \[\d/);
  let insertPos;
  if (firstEntryMatch) {
    insertPos = firstEntryMatch.index;
  } else {
    // 没有现有版本条目，插入到标题之后（或文件末尾）
    const headerEnd = content.indexOf('\n', content.indexOf('# 更新日志'));
    insertPos = headerEnd !== -1 ? headerEnd + 1 : content.length;
  }
  content = content.slice(0, insertPos) + entry + '\n' + content.slice(insertPos);

  fs.writeFileSync(changelogFile, content, 'utf-8');
  console.log(`✅ 更新 ${path.relative(rootDir, changelogFile)}`);
}

/**
 * 导出更新日志到根目录 CHANGELOG.md (Git 专用)
 */
function exportChangelog() {
  if (!fs.existsSync(changelogFile)) {
    console.error('❌ 文档站更新日志不存在，请先执行版本升级');
    process.exit(1);
  }

  const content = fs.readFileSync(changelogFile, 'utf-8');
  fs.writeFileSync(gitChangelogFile, content, 'utf-8');
  console.log(`✅ 已导出到 ${gitChangelogFile} (Git 专用)`);
}

/**
 * 同步版本号到所有文件，并写入更新日志
 */
function syncVersion(newVersion, changes = []) {
  console.log(`\n📦 更新版本号到: ${newVersion}\n`);

  // 1. 更新 version.json（仅版本号，不含 changelog）
  const versionData = loadVersion();
  versionData.version = newVersion;
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
  if (fs.existsSync(webVersionUtils)) {
    let content = fs.readFileSync(webVersionUtils, 'utf-8');
    content = content.replace(/version:\s*'[^']*'/, `version: '${newVersion}'`);
    fs.writeFileSync(webVersionUtils, content, 'utf-8');
    console.log('✅ 更新 web/src/utils/version.js');
  }

  // 5. 更新 fnapp/manifest
  if (fs.existsSync(fnappManifest)) {
    let content = fs.readFileSync(fnappManifest, 'utf-8');
    content = content.replace(/(^version\s*=\s*)[\d.]+/m, `$1${newVersion}`);
    fs.writeFileSync(fnappManifest, content, 'utf-8');
    console.log(`✅ 更新 ${path.relative(rootDir, fnappManifest)}`);
  }

  // 6. 更新 fnapp docker-compose 镜像标签
  if (fs.existsSync(dockerComposeFile)) {
    let content = fs.readFileSync(dockerComposeFile, 'utf-8');
    content = content.replace(/(image:\s*\S*magicpush:)[\d.]+/, `$1${newVersion}`);
    fs.writeFileSync(dockerComposeFile, content, 'utf-8');
    console.log(`✅ 更新 ${path.relative(rootDir, dockerComposeFile)}`);
  }

  // 6. 追加更新日志到文档站
  if (changes.length > 0) {
    appendChangelog(newVersion, changes);
  }

  console.log('\n🎉 版本号更新完成！');
}

/**
 * 从文档站读取并打印最近更新
 */
function printLatestUpdate() {
  if (!fs.existsSync(changelogFile)) {
    return;
  }
  const content = fs.readFileSync(changelogFile, 'utf-8');
  // 提取第一个版本条目
  const match = content.match(/^## \[([\d.]+)\] - ([\d-]+)$/m);
  if (!match) return;

  const version = match[1];
  const date = match[2];
  // 获取该条目下所有的列表项（直到下一个 ## 或 ---）
  const afterMatch = content.slice(match.index);
  const sectionEnd = afterMatch.search(/\n(?=## )|\n(?=---\n)/);
  const section = sectionEnd !== -1 ? afterMatch.slice(0, sectionEnd) : afterMatch;
  const items = [...section.matchAll(/^- (.+)$/gm)].map(m => m[1]);

  console.log('\n📝 最近更新:');
  console.log(`   ${version} (${date})`);
  items.forEach(item => console.log(`   - ${item}`));
}

/**
 * 打印完整更新日志（从文件读取）
 */
function printChangelog() {
  console.log('\n📜 版本更新记录:\n');
  if (!fs.existsSync(changelogFile)) {
    console.log('   暂无更新记录\n');
    return;
  }
  const content = fs.readFileSync(changelogFile, 'utf-8');
  // 输出除去"版本说明"之外的内容
  const lines = content.split('\n');
  let inVersionSection = false;
  for (const line of lines) {
    if (line.startsWith('## [')) inVersionSection = true;
    if (line === '---' && inVersionSection) { console.log(line); continue; }
    if (line.startsWith('## 版本说明')) break;
    if (inVersionSection || line.startsWith('# 更新日志')) console.log(line);
  }
  console.log('');
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
    printLatestUpdate();
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
    printChangelog();
    return;
  }

  if (command === 'export') {
    exportChangelog();
    return;
  }

  console.error(`
❌ 未知命令: ${command}

用法:
  node scripts/version.js                # 查看当前版本
  node scripts/version.js patch         # 更新补丁版本 (1.0.0 -> 1.0.1)
  node scripts/version.js minor         # 更新次版本 (1.0.0 -> 1.1.0)
  node scripts.version.js major         # 更新主版本 (1.0.0 -> 2.0.0)
  node scripts/version.js set 1.2.3     # 设置特定版本
  node scripts/version.js changelog     # 查看更新记录（从文档站读取）
  node scripts/version.js export        # 导出 CHANGELOG.md 到根目录 (Git 专用)

示例:
  node scripts/version.js patch "修复登录bug" "优化性能"
  node scripts.version.js minor "新增Webhook支持"
  node scripts.version.js major "重构认证系统"
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
  appendChangelog,
  exportChangelog,
};
