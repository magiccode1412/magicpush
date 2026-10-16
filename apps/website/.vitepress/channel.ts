import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type DocsChannel = 'dev' | 'stable'

export interface ChannelInfo {
  /** 判定结果 */
  channel: DocsChannel
  /** 判定依据，仅用于构建日志排查 */
  source: string
}

/** 被视为正式版的分支名 */
const STABLE_BRANCHES = ['main', 'master', 'release', 'prod', 'production']

/**
 * 各 CI 平台暴露的分支变量。
 * 顺序即优先级：GitHub Actions → CNB → Cloudflare Pages → Vercel → Netlify → 通用兜底。
 */
const BRANCH_ENV_KEYS = [
  'GITHUB_REF_NAME',
  'CNB_BRANCH',
  'CF_PAGES_BRANCH',
  'VERCEL_GIT_COMMIT_REF',
  'NETLIFY_BRANCH',
  'BRANCH_NAME',
  'BRANCH',
  'GIT_BRANCH',
]

/**
 * 从给定起点逐层向上查找文件，返回首个命中的绝对路径。
 * config 会被 VitePress 打包到临时目录后再执行，所以不能只用 import.meta.url，
 * 需要把 process.cwd() 一并作为起点并向上回溯。
 */
function locateUpward(fileName: string, startDirs: string[], maxDepth = 6): string | null {
  for (const start of startDirs) {
    let dir = start
    for (let i = 0; i < maxDepth; i++) {
      const candidate = path.join(dir, fileName)
      if (fs.existsSync(candidate)) return candidate
      const parent = path.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  return null
}

function baseDirs(): string[] {
  const dirs = [process.cwd()]
  try {
    dirs.push(path.dirname(fileURLToPath(import.meta.url)))
  } catch {
    // 非 ESM 环境下拿不到 import.meta.url，忽略即可，还有 cwd 兜底
  }
  return dirs
}

/** 已发布的最新版本号（version.json 的 version，兼容 latest），取不到时返回空串 */
export function readStableVersion(): string {
  const file = locateUpward('version.json', baseDirs())
  if (!file) return ''
  try {
    const json = JSON.parse(fs.readFileSync(file, 'utf-8'))
    const version = typeof json?.version === 'string' ? json.version.trim()
      : typeof json?.latest === 'string' ? json.latest.trim()
      : ''
    return version
  } catch {
    return ''
  }
}

/** changelog.md 中最靠前的版本号，取不到时返回空串 */
function readChangelogTopVersion(): string {
  const file = locateUpward(path.join('guide', 'changelog.md'), baseDirs())
  if (!file) return ''
  try {
    const content = fs.readFileSync(file, 'utf-8')
    const matched = content.match(/^##\s*\[(v?\d+\.\d+\.\d+[^\]]*)\]/m)
    return matched ? matched[1] : ''
  } catch {
    return ''
  }
}

/** 从 .git/HEAD 读当前分支名，detached HEAD 或未找到时返回空串 */
function readGitBranch(): string {
  const gitDir = locateUpward('.git', baseDirs())
  if (!gitDir) return ''
  try {
    const head = fs.readFileSync(path.join(gitDir, 'HEAD'), 'utf-8').trim()
    // worktree 场景下 .git 是文件：ref: ../...
    if (head.startsWith('ref:')) {
      return head.replace(/^ref:\s*/, '').replace(/^refs\/heads\//, '')
    }
    return ''
  } catch {
    return ''
  }
}

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/i, '')
    .split(/[.\-+]/)
    .map((part) => parseInt(part, 10) || 0)
}

/** 语义化版本比较：a > b 返回正数，a < b 返回负数，相等返回 0 */
function compareVersion(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * 判定本次构建属于哪个渠道，优先级从高到低：
 *   1. DOCS_CHANNEL 环境变量显式指定（dev / stable）
 *   2. CI 分支变量（GitHub Actions / CNB / Pages 平台等）
 *   3. .git/HEAD 当前分支名
 *   4. 兜底推断：changelog 顶格版本领先 version.json 的 version → 开发版
 *   5. 都拿不到 → stable（保守默认，避免正式站误挂“开发版”标识）
 */
export function resolveChannel(): ChannelInfo {
  const explicit = (process.env.DOCS_CHANNEL || '').trim().toLowerCase()
  if (explicit === 'dev' || explicit === 'stable') {
    return { channel: explicit, source: 'DOCS_CHANNEL' }
  }

  for (const key of BRANCH_ENV_KEYS) {
    const branch = (process.env[key] || '').trim()
    if (!branch) continue
    const channel = STABLE_BRANCHES.includes(branch.toLowerCase()) ? 'stable' : 'dev'
    return { channel, source: `${key}=${branch}` }
  }

  const gitBranch = readGitBranch()
  if (gitBranch) {
    const channel = STABLE_BRANCHES.includes(gitBranch.toLowerCase()) ? 'stable' : 'dev'
    return { channel, source: `git branch=${gitBranch}` }
  }

  const released = readStableVersion()
  const pending = readChangelogTopVersion()
  if (released && pending) {
    if (compareVersion(pending, released) > 0) {
      return { channel: 'dev', source: `infer(待发布 ${pending} > 已发布 ${released})` }
    }
    return { channel: 'stable', source: `infer(已发布 ${released} 为最新)` }
  }

  return { channel: 'stable', source: 'default' }
}
