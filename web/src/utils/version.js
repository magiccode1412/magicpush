// 版本信息（默认值，成功从服务端获取后会被覆盖）
export const VERSION = {
  name: 'MagicPush',
  version: '1.9.0',
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
const REMOTE_CACHE_KEY = 'mp_remote_version_check'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24小时缓存

/**
 * 检查远程是否有新版本可用
 * @param {boolean} force - 是否强制忽略缓存重新请求
 * @returns {Promise<{hasUpdate: boolean, remoteVersion: string, latestChangelog: Object|null}|null>}
 */
export const checkRemoteVersion = async (force = false) => {
  // 尝试读取缓存
  let cached = null
  try {
    cached = JSON.parse(localStorage.getItem(REMOTE_CACHE_KEY))
  } catch { /* ignore */ }

  // 非强制模式且缓存有效，直接用缓存结果比较
  if (!force && cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    return buildResult(cached.remoteVersion, cached.latestChangelog)
  }

  try {
    const res = await fetch(CDN_VERSION_URL + (force ? '?_=' + Date.now() : ''))
    if (!res.ok) return null
    const data = await res.json()

    const resultData = {
      timestamp: Date.now(),
      remoteVersion: data.version,
      latestChangelog: data.changelog?.[0] || null,
      allChangelog: data.changelog || [],
    }

    // 写入缓存
    try {
      localStorage.setItem(REMOTE_CACHE_KEY, JSON.stringify(resultData))
    } catch { /* ignore */ }

    return buildResult(data.version, resultData.latestChangelog)
  } catch {
    // 网络失败不影响使用
    return null
  }
}

function buildResult(remoteVersion, latestChangelog) {
  return {
    hasUpdate: semverGt(remoteVersion, VERSION.version),
    remoteVersion,
    latestChangelog,
  }
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
