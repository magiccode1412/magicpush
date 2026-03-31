// 版本信息
export const VERSION = {
  name: 'MagicPush',
  version: '1.6.2',
  get displayName() {
    return `${this.name} v${this.version}`
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
