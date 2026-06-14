// 版本信息（默认值，成功从服务端获取后会被覆盖）
export const VERSION = {
  name: 'MagicPush',
  version: '1.12.0',
  get displayName() {
    return this.name + (this.version ? ` v${this.version}` : '')
  },
  get shortVersion() {
    const parts = this.version.split('.')
    return `${parts[0]}.${parts[1]}`
  }
}

// 从服务器获取版本信息
export const fetchVersionFromServer = async () => {
  try {
    const response = await fetch('/api/version')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        VERSION.version = data.data.version
        VERSION.name = data.data.displayName || data.data.name
        return data.data
      }
    }
  } catch (error) {
    console.error('Failed to fetch version from server:', error)
  }
  return null
}

// 远程版本检测（前端直连 jsdelivr CDN）
const CDN_VERSION_URL = 'https://cdn.jsdelivr.net/gh/magiccode1412/magicpush@main/version.json'
const CDN_DEV_VERSION_URL = 'https://cdn.jsdelivr.net/gh/magiccode1412/magicpush@dev/version.json'
const REMOTE_CACHE_KEY = 'mp_remote_version_check'
const REMOTE_DEV_CACHE_KEY = 'mp_remote_dev_version_check'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存

/**
 * 获取远程更新检测是否启用（从 localStorage 读取，默认启用）
 */
export const getCheckUpdateEnabled = () => {
  try {
    const val = localStorage.getItem('mp_check_update_enabled')
    return val === null ? true : val === 'true'
  } catch {
    return true
  }
}

/**
 * 获取是否同时检测 dev 版本更新（从 localStorage 读取，默认关闭）
 */
export const getCheckUpdateDevEnabled = () => {
  try {
    return localStorage.getItem('mp_check_update_dev_enabled') === 'true'
  } catch {
    return false
  }
}

/**
 * 检查远程是否有新版本可用
 * @param {boolean} force - 是否强制忽略缓存重新请求
 * @returns {Promise<{hasUpdate: boolean, remoteVersion: string, latestChangelog: Object|null}|null>}
 */
export const checkRemoteVersion = async (force = false) => {
  return _fetchRemoteVersion(CDN_VERSION_URL, REMOTE_CACHE_KEY, force)
}

function buildResult(remoteVersion, latestChangelog) {
  return {
    hasUpdate: semverGt(remoteVersion, VERSION.version),
    remoteVersion,
    latestChangelog,
  }
}

/**
 * 内部通用版本检测函数
 */
async function _fetchRemoteVersion(url, cacheKey, force = false) {
  let cached = null
  try { cached = JSON.parse(localStorage.getItem(cacheKey)) } catch { /* ignore */ }

  if (!force && cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return buildResult(cached.remoteVersion, cached.latestChangelog)
  }

  try {
    const res = await fetch(url + (force ? '?_=' + Date.now() : ''))
    if (!res.ok) return null
    const data = await res.json()

    const resultData = {
      timestamp: Date.now(),
      remoteVersion: data.version,
      latestChangelog: data.changelog?.[0] || null,
      allChangelog: data.changelog || [],
    }

    try { localStorage.setItem(cacheKey, JSON.stringify(resultData)) } catch { /* ignore */ }
    return buildResult(data.version, resultData.latestChangelog)
  } catch {
    return null
  }
}

/**
 * 检测 dev 分支是否有新版本可用
 * @param {boolean} force - 是否强制忽略缓存重新请求
 * @returns {Promise<{hasUpdate: boolean, remoteVersion: string, latestChangelog: Object|null}|null>}
 */
export const checkRemoteVersionDev = async (force = false) => {
  return _fetchRemoteVersion(CDN_DEV_VERSION_URL, REMOTE_DEV_CACHE_KEY, force)
}

/**
 * 简易语义化版本号比较：判断 a 是否大于 b
 */
function semverGt(a, b) {
  if (!a || !b) return false
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const va = pa[i] || 0
    const vb = pb[i] || 0
    if (va > vb) return true
    if (va < vb) return false
  }
  return false
}
