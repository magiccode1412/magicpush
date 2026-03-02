<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">接口文档</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">了解如何使用推送服务 API</p>
      </div>
    </div>

    <!-- 快速开始 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Rocket class="w-5 h-5 text-blue-500" />
        快速开始
      </h3>
      <div class="prose dark:prose-invert max-w-none">
        <p class="text-gray-600 dark:text-gray-300">
          使用推送服务非常简单，只需要以下三步：
        </p>
        <ol class="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>在<strong>接口管理</strong>页面创建一个推送接口</li>
          <li>在<strong>渠道管理</strong>页面配置消息渠道（企业微信、Telegram 等）</li>
          <li>将渠道绑定到接口，然后使用接口令牌调用 API 发送消息</li>
        </ol>
      </div>
    </div>

    <!-- API 基础信息 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Server class="w-5 h-5 text-green-500" />
        API 基础信息
      </h3>
      <div class="space-y-4">
        <div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400 w-20">基础 URL</span>
          <code class="text-sm text-gray-700 dark:text-gray-300">{{ apiBaseUrl }}</code>
        </div>
        <div class="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400 w-20">Content-Type</span>
          <code class="text-sm text-gray-700 dark:text-gray-300">application/json</code>
        </div>
      </div>
    </div>

    <!-- 推送接口 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Send class="w-5 h-5 text-purple-500" />
        推送消息
      </h3>
      
      <!-- 方式1: URL 中的 Token -->
      <div class="mb-6">
        <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">方式一：Token 在 URL 路径中</h4>
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded">GET</span>
            <code class="text-sm text-gray-700 dark:text-gray-300">/api/push/{token}?title=标题&content=内容</code>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">POST</span>
            <code class="text-sm text-gray-700 dark:text-gray-300">/api/push/{token}</code>
          </div>
          
          <div class="bg-gray-900 rounded-lg p-4 mt-3">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-400">请求示例 (GET)</span>
              <button @click="copyCode(getExample)" class="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <Copy class="w-3 h-3" />
                复制
              </button>
            </div>
            <pre class="text-sm text-green-400 overflow-x-auto"><code>{{ getExample }}</code></pre>
          </div>

          <div class="bg-gray-900 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-400">请求示例 (POST)</span>
              <button @click="copyCode(postExample)" class="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                <Copy class="w-3 h-3" />
                复制
              </button>
            </div>
            <pre class="text-sm text-green-400 overflow-x-auto"><code>{{ postExample }}</code></pre>
          </div>
        </div>
      </div>

      <!-- 方式2: Authorization 头 -->
      <div>
        <h4 class="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">方式二：Token 在 Authorization 头中（推荐）</h4>
        <div class="flex items-center gap-2 mb-3">
          <span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">POST</span>
          <code class="text-sm text-gray-700 dark:text-gray-300">/api/push/</code>
        </div>
        
        <div class="bg-gray-900 rounded-lg p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-400">请求示例</span>
            <button @click="copyCode(authExample)" class="text-xs text-gray-400 hover:text-white flex items-center gap-1">
              <Copy class="w-3 h-3" />
              复制
            </button>
          </div>
          <pre class="text-sm text-green-400 overflow-x-auto"><code>{{ authExample }}</code></pre>
        </div>
      </div>
    </div>

    <!-- 请求参数 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <List class="w-5 h-5 text-orange-500" />
        请求参数
      </h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700">
              <th class="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">参数</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">类型</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">必填</th>
              <th class="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">说明</th>
            </tr>
          </thead>
          <tbody class="text-gray-600 dark:text-gray-400">
            <tr class="border-b border-gray-100 dark:border-gray-700/50">
              <td class="py-3 px-4"><code>token</code></td>
              <td class="py-3 px-4">string</td>
              <td class="py-3 px-4"><span class="text-red-500">是</span></td>
              <td class="py-3 px-4">接口令牌，可在接口管理页面获取</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-700/50">
              <td class="py-3 px-4"><code>title</code></td>
              <td class="py-3 px-4">string</td>
              <td class="py-3 px-4"><span class="text-gray-400">否</span></td>
              <td class="py-3 px-4">消息标题，最多200字符</td>
            </tr>
            <tr class="border-b border-gray-100 dark:border-gray-700/50">
              <td class="py-3 px-4"><code>content</code></td>
              <td class="py-3 px-4">string</td>
              <td class="py-3 px-4"><span class="text-red-500">是</span></td>
              <td class="py-3 px-4">消息内容，最多5000字符</td>
            </tr>
            <tr>
              <td class="py-3 px-4"><code>type</code></td>
              <td class="py-3 px-4">string</td>
              <td class="py-3 px-4"><span class="text-gray-400">否</span></td>
              <td class="py-3 px-4">消息类型：text、markdown、html，默认 text</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 响应说明 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <MessageSquare class="w-5 h-5 text-cyan-500" />
        响应说明
      </h3>
      
      <div class="space-y-4">
        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">成功响应 (200)</h4>
          <div class="bg-gray-900 rounded-lg p-4">
            <pre class="text-sm text-green-400 overflow-x-auto"><code>{{ successResponse }}</code></pre>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">失败响应 (400)</h4>
          <div class="bg-gray-900 rounded-lg p-4">
            <pre class="text-sm text-red-400 overflow-x-auto"><code>{{ errorResponse }}</code></pre>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">状态码说明</h4>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-gray-200 dark:border-gray-700">
                  <th class="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">状态码</th>
                  <th class="text-left py-2 px-4 font-medium text-gray-700 dark:text-gray-300">说明</th>
                </tr>
              </thead>
              <tbody class="text-gray-600 dark:text-gray-400">
                <tr class="border-b border-gray-100 dark:border-gray-700/50">
                  <td class="py-2 px-4"><code>200</code></td>
                  <td class="py-2 px-4">推送成功</td>
                </tr>
                <tr class="border-b border-gray-100 dark:border-gray-700/50">
                  <td class="py-2 px-4"><code>400</code></td>
                  <td class="py-2 px-4">请求参数错误或部分渠道推送失败</td>
                </tr>
                <tr class="border-b border-gray-100 dark:border-gray-700/50">
                  <td class="py-2 px-4"><code>401</code></td>
                  <td class="py-2 px-4">接口令牌无效或已过期</td>
                </tr>
                <tr>
                  <td class="py-2 px-4"><code>404</code></td>
                  <td class="py-2 px-4">接口不存在</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- 常见问题 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <HelpCircle class="w-5 h-5 text-yellow-500" />
        常见问题
      </h3>
      <div class="space-y-4">
        <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 class="font-medium text-gray-800 dark:text-gray-200 mb-2">Q: 接口令牌会过期吗？</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            A: 接口令牌永久有效，除非您手动重新生成或删除接口。如需更换令牌，可在接口管理页面点击"重新生成令牌"。
          </p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 class="font-medium text-gray-800 dark:text-gray-200 mb-2">Q: 为什么推送返回"部分推送失败"？</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            A: 这表示接口已绑定多个渠道，其中部分渠道推送成功，部分失败。请检查响应中的 results 字段查看每个渠道的详细状态，并确认渠道配置是否正确。
          </p>
        </div>
        <div class="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <h4 class="font-medium text-gray-800 dark:text-gray-200 mb-2">Q: GET 和 POST 请求有什么区别？</h4>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            A: GET 请求适合简单的测试场景，参数通过 URL 传递；POST 请求适合正式使用，参数通过请求体传递，支持更长的内容和特殊字符。两种方式功能完全相同。
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Rocket,
  Server,
  Send,
  List,
  MessageSquare,
  HelpCircle,
  Copy,
} from 'lucide-vue-next'

const apiBaseUrl = window.location.origin

const getExample = `curl "${apiBaseUrl}/api/push/your_token?title=测试消息&content=这是一条测试消息&type=text"`

const postExample = `curl -X POST ${apiBaseUrl}/api/push/your_token \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "测试消息",
    "content": "这是一条测试消息",
    "type": "text"
  }'`

const authExample = `curl -X POST ${apiBaseUrl}/api/push \\
  -H "Authorization: Bearer your_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "测试消息",
    "content": "这是一条测试消息",
    "type": "text"
  }'`

const successResponse = JSON.stringify({
  success: true,
  code: 200,
  message: "推送成功",
  data: {
    success: true,
    total: 2,
    successCount: 2,
    failedCount: 0,
    results: [
      {
        success: true,
        channelId: 1,
        channelType: "wecom",
        channelName: "企业微信"
      }
    ]
  }
}, null, 2)

const errorResponse = JSON.stringify({
  success: false,
  code: 400,
  message: "部分推送失败",
  data: null
}, null, 2)

const copyCode = (code) => {
  navigator.clipboard.writeText(code)
  ElMessage.success('已复制到剪贴板')
}
</script>
