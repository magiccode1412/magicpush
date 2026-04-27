<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">接口管理</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">管理您的推送接口和访问令牌</p>
      </div>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        新建接口
      </el-button>
    </div>

    <!-- 接口列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="endpoint in endpoints"
        :key="endpoint.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Link class="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ endpoint.name }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ endpoint.is_active ? '启用' : '禁用' }}
              </p>
            </div>
          </div>
          <el-dropdown @command="(cmd) => handleCommand(cmd, endpoint)">
            <el-button text>
              <MoreVertical class="w-4 h-4" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit class="w-4 h-4 mr-2" />
                  编辑
                </el-dropdown-item>
                <el-dropdown-item command="token">
                  <Key class="w-4 h-4 mr-2" />
                  重新生成令牌
                </el-dropdown-item>
                <el-dropdown-item command="keywordFilter">
                  <Shield class="w-4 h-4 mr-2" />
                  关键词过滤
                </el-dropdown-item>
                <el-dropdown-item command="doNotDisturb">
                  <BellOff class="w-4 h-4 mr-2" />
                  消息免打扰
                </el-dropdown-item>
                <el-dropdown-item divided command="delete">
                  <Trash2 class="w-4 h-4 mr-2" />
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 描述 / 占位 -->
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 min-h-[2.5rem]">
          {{ endpoint.description || '暂无描述' }}
        </p>

        <!-- Token -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-gray-500 dark:text-gray-400">访问令牌</span>
            <el-button text size="small" @click="copyToken(endpoint.token)">
              <Copy class="w-3 h-3 mr-1" />
              复制
            </el-button>
          </div>
          <code class="text-xs text-gray-700 dark:text-gray-300 break-all">{{ endpoint.token }}</code>
        </div>

        <!-- 绑定的渠道 / 占位 -->
        <div class="mb-4">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="channel in (endpoint.channels || [])"
              :key="channel.id"
              class="inline-flex items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-xs"
            >
              {{ channel.name }}
            </span>
            <span
              v-if="!endpoint.channels || endpoint.channels.length === 0"
              class="inline-flex items-center px-2 py-1 text-xs text-gray-400 dark:text-gray-500"
            >
              暂未绑定渠道
            </span>
          </div>
        </div>

        <!-- 入站配置状态 -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Settings2 class="w-4 h-4 text-gray-400" />
              <span class="text-xs text-gray-500 dark:text-gray-400">入站配置</span>
            </div>
            <el-button text size="small" @click="openInboundConfig(endpoint)">
              <span v-if="endpoint.inbound_config?.enabled" class="text-green-500">已配置</span>
              <span v-else class="text-gray-400">未配置</span>
            </el-button>
          </div>
        </div>

        <!-- 关键词过滤状态 -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Shield class="w-4 h-4 text-gray-400" />
              <span class="text-xs text-gray-500 dark:text-gray-400">关键词过滤</span>
            </div>
            <el-button text size="small" @click="openKeywordFilter(endpoint)">
              <span v-if="endpoint.keyword_filter?.enabled"
                    :class="endpoint.keyword_filter.mode === 'blacklist' ? 'text-orange-500' : 'text-blue-500'">
                {{ endpoint.keyword_filter.mode === 'blacklist' ? '黑名单模式' : '白名单模式' }}
              </span>
              <span v-else class="text-gray-400">未配置</span>
            </el-button>
          </div>
        </div>

        <!-- 消息免打扰状态 -->
        <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <BellOff class="w-4 h-4 text-gray-400" />
              <span class="text-xs text-gray-500 dark:text-gray-400">消息免打扰</span>
            </div>
            <el-button text size="small" @click="openDoNotDisturb(endpoint)">
              <span v-if="endpoint.do_not_disturb?.enabled" class="text-purple-500">
                {{ endpoint.do_not_disturb.timeRanges?.length || 0 }} 个时段
              </span>
              <span v-else class="text-gray-400">未配置</span>
            </el-button>
          </div>
        </div>

        <!-- 统计 -->
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-500 dark:text-gray-400">
            最后使用: {{ endpoint.last_used_at ? formatDate(endpoint.last_used_at) : '从未' }}
          </span>
          <el-switch
            v-model="endpoint.is_active"
            :active-value="1"
            :inactive-value="0"
            @change="(val) => toggleActive(endpoint, val)"
          />
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="endpoints.length === 0" class="text-center py-16">
      <div class="w-20 h-20 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        <Link class="w-10 h-10 text-gray-400" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无接口</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">创建您的第一个推送接口</p>
      <el-button type="primary" @click="showCreateDialog = true">
        <Plus class="w-4 h-4 mr-1" />
        新建接口
      </el-button>
    </div>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingEndpoint ? '编辑接口' : '新建接口'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="接口名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入接口名称" />
        </el-form-item>

        <el-form-item label="接口描述">
          <el-input
            v-model="form.description"
            type="textarea"
            rows="3"
            placeholder="请输入接口描述（可选）"
          />
        </el-form-item>

        <el-form-item label="访问令牌">
          <div class="space-y-2">
            <el-radio-group v-model="form.tokenType">
              <el-radio value="auto">自动生成</el-radio>
              <el-radio value="manual">手动设置</el-radio>
            </el-radio-group>

            <el-input
              v-if="form.tokenType === 'manual'"
              v-model="form.token"
              placeholder="请输入自定义令牌（至少6个字符）"
              :show-word-limit="true"
              maxlength="100"
              @blur="validateTokenInput"
            >
              <template #suffix>
                <el-button text size="small" @click="generateRandomToken">
                  <RefreshCw class="w-3 h-3" />
                </el-button>
              </template>
            </el-input>

            <div v-if="tokenValidation.status" class="text-xs" :class="tokenValidation.valid ? 'text-green-600' : 'text-red-600'">
              {{ tokenValidation.message }}
            </div>
          </div>
        </el-form-item>

        <el-form-item label="绑定渠道">
          <el-select
            v-model="form.channelIds"
            multiple
            placeholder="选择要绑定的渠道"
            class="w-full"
          >
            <el-option
              v-for="channel in channels"
              :key="channel.id"
              :label="channel.name"
              :value="channel.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
          {{ editingEndpoint ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 入站配置抽屉 -->
    <el-drawer
      v-model="showInboundDrawer"
      title="入站 Webhook 配置"
      direction="rtl"
      size="500px"
    >
      <div class="p-4 space-y-6">
        <!-- 启用开关 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">启用入站接收</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">允许外部服务通过 Webhook 推送消息</div>
          </div>
          <el-switch v-model="inboundForm.enabled" />
        </div>

        <el-divider v-if="inboundForm.enabled" />

        <!-- 数据来源类型 -->
        <div v-if="inboundForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-3">数据来源类型</div>
          <div class="space-y-2">
            <label
              v-for="template in inboundTemplates"
              :key="template.id"
              class="flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="inboundForm.sourceType === template.id 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
            >
              <el-radio 
                v-model="inboundForm.sourceType" 
                :value="template.id"
                class="mt-0.5 !mr-0"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">{{ template.name }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400">{{ template.description }}</div>
              </div>
            </label>
          </div>
        </div>

        <!-- 字段映射 -->
        <div v-if="inboundForm.enabled && inboundForm.sourceType === 'generic'">
          <div class="font-medium text-gray-900 dark:text-white mb-3">字段映射规则</div>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">标题字段 (JSONPath)</label>
              <el-input 
                v-model="inboundForm.fieldMapping.title" 
                placeholder="$.alerts[0].labels.alertname"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">内容字段 (JSONPath)</label>
              <el-input 
                v-model="inboundForm.fieldMapping.content" 
                placeholder="$.alerts[0].annotations.message"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">消息类型</label>
              <el-select v-model="inboundForm.defaultValues.type" class="w-full">
                <el-option label="纯文本 (text)" value="text" />
                <el-option label="Markdown" value="markdown" />
                <el-option label="HTML" value="html" />
              </el-select>
            </div>
          </div>
        </div>

        <el-divider v-if="inboundForm.enabled && inboundForm.sourceType === 'generic'" />

        <!-- 接收地址 -->
        <div v-if="inboundForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-3">接收地址</div>
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div class="flex items-center justify-between">
              <code class="text-xs text-gray-700 dark:text-gray-300 break-all">
                POST {{ inboundUrl }}
              </code>
              <el-button text size="small" @click="copyInboundUrl">
                <Copy class="w-3 h-3" />
              </el-button>
            </div>
          </div>
        </div>

        <el-divider v-if="inboundForm.enabled" />

        <!-- 测试 -->
        <div v-if="inboundForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-3">测试请求</div>
          <el-input
            v-model="inboundTestData"
            type="textarea"
            :rows="6"
            placeholder='{"alerts": [{"labels": {"alertname": "测试告警"}, "annotations": {"message": "测试消息"}}]}'
          />
          <el-button 
            type="primary" 
            class="mt-3 w-full" 
            :loading="inboundTestLoading"
            @click="testInbound"
          >
            发送测试请求
          </el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="showInboundDrawer = false">取消</el-button>
        <el-button type="primary" :loading="inboundSaving" @click="saveInboundConfig">
          保存配置
        </el-button>
      </template>
    </el-drawer>

    <!-- 关键词过滤抽屉 -->
    <el-drawer
      v-model="showKeywordFilterDrawer"
      title="关键词过滤"
      direction="rtl"
      size="450px"
    >
      <div class="p-4 space-y-6">
        <!-- 启用开关 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">启用关键词过滤</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">开启后将对推送消息进行关键词过滤</div>
          </div>
          <el-switch v-model="keywordForm.enabled" />
        </div>

        <el-divider v-if="keywordForm.enabled" />

        <!-- 过滤模式 -->
        <div v-if="keywordForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-3">过滤模式</div>
          <div class="space-y-2">
            <label
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="keywordForm.mode === 'blacklist'
                ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
            >
              <el-radio
                v-model="keywordForm.mode"
                value="blacklist"
                class="mt-0.5 !mr-0"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">黑名单模式（默认）</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  消息标题或内容包含列表中任一关键词时将被拒绝发送，并返回"包含不合法内容"
                </div>
              </div>
            </label>
            <label
              class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors"
              :class="keywordForm.mode === 'whitelist'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'"
            >
              <el-radio
                v-model="keywordForm.mode"
                value="whitelist"
                class="mt-0.5 !mr-0"
              />
              <div>
                <div class="font-medium text-gray-900 dark:text-white">白名单模式</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  仅当消息标题或内容包含列表中至少一个关键词时才允许发送，否则拒绝
                </div>
              </div>
            </label>
          </div>
        </div>

        <el-divider v-if="keywordForm.enabled" />

        <!-- 关键词列表 -->
        <div v-if="keywordForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-2">
            关键词列表
            <span class="text-xs font-normal text-gray-400 ml-2">
              ({{ keywordForm.keywords.length }}/50)
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
            每行一个关键词，大小写不敏感，匹配到任一关键词即触发规则
          </p>
          <div class="space-y-2">
            <div
              v-for="(kw, index) in keywordForm.keywords"
              :key="index"
              class="flex items-center gap-2"
            >
              <el-input
                v-model="keywordForm.keywords[index]"
                placeholder="输入关键词"
                maxlength="50"
                show-word-limit
                size="default"
              />
              <el-button
                text
                type="danger"
                size="default"
                @click="removeKeyword(index)"
                :disabled="keywordForm.keywords.length <= 1"
              >
                <X class="w-4 h-4" />
              </el-button>
            </div>
            <el-button
              v-if="keywordForm.keywords.length < 50"
              class="w-full"
              plain
              @click="addKeyword"
            >
              <Plus class="w-4 h-4 mr-1" />
              添加关键词
            </el-button>
          </div>

          <el-divider />

          <!-- 说明区域 -->
          <div class="rounded-lg p-3 space-y-3" :class="keywordForm.mode === 'blacklist' ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-blue-50 dark:bg-blue-900/10'">
            <div class="flex gap-2">
              <AlertTriangle v-if="keywordForm.mode === 'blacklist'" class="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
              <Info v-else class="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <div class="text-xs leading-relaxed" :class="keywordForm.mode === 'blacklist' ? 'text-orange-700 dark:text-orange-300' : 'text-blue-700 dark:text-blue-300'">
                <p v-if="keywordForm.mode === 'blacklist'">
                  <strong>黑名单说明：</strong><br/>
                  当消息标题或内容包含上方列表中<strong>任意一个</strong>关键词时，
                  该消息将被拦截并返回错误信息"包含不合法内容"，不会推送到任何渠道。
                  适用于过滤垃圾广告、敏感词汇等场景。
                </p>
                <p v-else>
                  <strong>白名单说明：</strong><br/>
                  当消息标题或内容<strong>未包含</strong>上方列表中任何关键词时，
                  该消息将被拦截。仅当包含至少一个关键词的消息才被放行推送。
                  适用于只接收特定主题消息的场景。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showKeywordFilterDrawer = false">取消</el-button>
        <el-button type="primary" :loading="keywordSaving" @click="saveKeywordFilter">
          保存配置
        </el-button>
      </template>
    </el-drawer>

    <!-- 消息免打扰抽屉 -->
    <el-drawer
      v-model="showDndDrawer"
      title="消息免打扰"
      direction="rtl"
      size="450px"
    >
      <div class="p-4 space-y-6">
        <!-- 启用开关 -->
        <div class="flex items-center justify-between">
          <div>
            <div class="font-medium text-gray-900 dark:text-white">启用消息免打扰</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">在指定时间段内暂停推送，推送记录仍会正常保存</div>
          </div>
          <el-switch v-model="dndForm.enabled" />
        </div>

        <el-divider v-if="dndForm.enabled" />

        <!-- 时间段列表 -->
        <div v-if="dndForm.enabled">
          <div class="font-medium text-gray-900 dark:text-white mb-2">
            时间段设置
            <span class="text-xs font-normal text-gray-400 ml-2">
              ({{ dndForm.timeRanges.length }}/5)
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
            在以下时间段内的推送将被静默，支持跨天设置（如 22:00 ~ 08:00）
          </p>

          <div class="space-y-3">
            <div
              v-for="(range, index) in dndForm.timeRanges"
              :key="index"
              class="flex items-center gap-2"
            >
              <el-time-picker
                v-model="range.start"
                placeholder="开始"
                format="HH:mm"
                value-format="HH:mm"
                class="flex-1"
              />
              <span class="text-gray-400 text-sm">至</span>
              <el-time-picker
                v-model="range.end"
                placeholder="结束"
                format="HH:mm"
                value-format="HH:mm"
                class="flex-1"
              />
              <el-button
                type="danger"
                :icon="Trash2"
                circle
                size="small"
                @click="removeDndRange(index)"
                :disabled="dndForm.timeRanges.length <= 1"
              />
            </div>

            <el-button
              v-if="dndForm.timeRanges.length < 5"
              class="w-full !ml-0"
              plain
              size="small"
              @click="addDndRange"
            >
              <Plus class="w-4 h-4 mr-1" />
              添加时间段
            </el-button>
          </div>

          <el-divider />

          <!-- 说明区域 -->
          <div class="rounded-lg p-3 bg-purple-50 dark:bg-purple-900/10">
            <div class="flex gap-2">
              <Clock class="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <div class="text-xs leading-relaxed text-purple-700 dark:text-purple-300">
                <p><strong>免打扰说明：</strong></p>
                <p class="mt-1">
                  在设定的时间段内，推送到该接口的消息将不会被发送到任何渠道，
                  但<strong>推送记录会正常保存</strong>，状态显示为「已静默」。
                  适用于夜间休息、会议等不希望被消息打扰的场景。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="showDndDrawer = false">取消</el-button>
        <el-button type="primary" :loading="dndSaving" @click="saveDoNotDisturb">
          保存配置
        </el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  regenerateToken,
  updateEndpointChannels,
  validateToken,
  getEndpointChannels,
  updateInboundConfig,
  getInboundTemplates,
  updateKeywordFilter,
  updateDoNotDisturb,
} from '@/api/endpoint'
import { getChannels } from '@/api/channel'
import {
  Plus,
  Link,
  MoreVertical,
  Edit,
  Key,
  Trash2,
  Copy,
  RefreshCw,
  Settings2,
  Shield,
  X,
  AlertTriangle,
  Info,
  BellOff,
  Clock,
} from 'lucide-vue-next'

const endpoints = ref([])
const channels = ref([])
const showCreateDialog = ref(false)
const formLoading = ref(false)
const editingEndpoint = ref(null)

// 入站配置相关
const showInboundDrawer = ref(false)
const inboundEditingEndpoint = ref(null)
const inboundTemplates = ref([])
const inboundSaving = ref(false)
const inboundTestLoading = ref(false)
const inboundTestData = ref('')

// 关键词过滤相关
const showKeywordFilterDrawer = ref(false)
const keywordEditingEndpoint = ref(null)
const keywordSaving = ref(false)

const keywordForm = reactive({
  enabled: false,
  mode: 'blacklist',
  keywords: [''],
})

// 消息免打扰相关
const showDndDrawer = ref(false)
const dndEditingEndpoint = ref(null)
const dndSaving = ref(false)

const dndForm = reactive({
  enabled: false,
  timeRanges: [{ start: '22:00', end: '08:00' }],
})

// 各数据来源类型的示例数据
const inboundExampleData = {
  grafana: {
    alerts: [{
      labels: { alertname: '测试告警' },
      annotations: { message: '这是一条测试消息' }
    }]
  },
  prometheus: {
    alerts: [{
      labels: { alertname: 'InstanceDown', severity: 'critical' },
      annotations: { description: '节点 node-01 已宕机超过5分钟' }
    }]
  },
  github: {
    action: 'opened',
    repository: { full_name: 'owner/repo' },
    sender: { login: 'username' }
  },
  emby: {
    Title: 'Test Notification',
    Description: 'Test Notification Description',
    Event: 'system.webhooktest',
    User: { Name: 'emby' },
    Server: { Name: 'Emby' }
  },
  generic: {
    title: '示例标题',
    content: '示例内容',
    type: 'text'
  }
}

const inboundForm = reactive({
  enabled: false,
  sourceType: 'generic',
  fieldMapping: {
    title: '',
    content: '',
  },
  defaultValues: {
    type: 'text',
    title: '新消息',
  },
})

const formRef = ref(null)
const form = reactive({
  name: '',
  description: '',
  token: '',
  tokenType: 'auto',
  channelIds: [],
})

const tokenValidation = reactive({
  status: false,
  valid: false,
  message: '',
})

const formRules = {
  name: [
    { required: true, message: '请输入接口名称', trigger: 'blur' },
    { max: 50, message: '名称不能超过50个字符', trigger: 'blur' },
  ],
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('zh-CN')
}

const generateRandomToken = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  form.token = token
}

const validateTokenInput = async () => {
  if (!form.token) {
    tokenValidation.status = false
    return
  }

  if (form.token.length < 6) {
    tokenValidation.status = true
    tokenValidation.valid = false
    tokenValidation.message = '令牌长度至少为6个字符'
    return
  }

  try {
    const res = await validateToken(form.token)
    if (res.success) {
      if (res.data.valid) {
        tokenValidation.status = true
        tokenValidation.valid = true
        tokenValidation.message = '令牌可用'
      } else {
        tokenValidation.status = true
        tokenValidation.valid = false
        tokenValidation.message = '该令牌已被使用'
      }
    }
  } catch (error) {
    tokenValidation.status = false
  }
}

const loadData = async () => {
  try {
    const [endpointsRes, channelsRes, templatesRes] = await Promise.all([
      getEndpoints(),
      getChannels(),
      getInboundTemplates(),
    ])
    if (endpointsRes.success) {
      endpoints.value = endpointsRes.data || []
    }
    if (channelsRes.success) {
      channels.value = channelsRes.data || []
    }
    if (templatesRes.success) {
      inboundTemplates.value = templatesRes.data || []
    }
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

const copyToken = (token) => {
  navigator.clipboard.writeText(token)
  ElMessage.success('令牌已复制')
}

const handleCommand = async (command, endpoint) => {
  if (command === 'edit') {
    editingEndpoint.value = endpoint
    form.name = endpoint.name
    form.description = endpoint.description || ''
    form.token = endpoint.token
    form.tokenType = 'manual'
    form.channelIds = []
    tokenValidation.status = false

    // 加载已绑定的渠道
    try {
      const res = await getEndpointChannels(endpoint.id)
      if (res.success && res.data) {
        form.channelIds = res.data.map(channel => channel.id)
      }
    } catch (error) {
      console.error('加载渠道失败:', error)
    }

    showCreateDialog.value = true
  } else if (command === 'token') {
    handleRegenerateToken(endpoint)
  } else if (command === 'keywordFilter') {
    openKeywordFilter(endpoint)
  } else if (command === 'doNotDisturb') {
    openDoNotDisturb(endpoint)
  } else if (command === 'delete') {
    handleDelete(endpoint)
  }
}

const handleRegenerateToken = async (endpoint) => {
  try {
    await ElMessageBox.confirm('重新生成令牌后，旧令牌将立即失效，是否继续？', '提示', {
      type: 'warning',
    })
    const res = await regenerateToken(endpoint.id)
    if (res.success) {
      ElMessage.success('令牌重新生成成功')
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleDelete = async (endpoint) => {
  try {
    await ElMessageBox.confirm('删除后无法恢复，是否继续？', '提示', {
      type: 'warning',
    })
    const res = await deleteEndpoint(endpoint.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadData()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const toggleActive = async (endpoint, val) => {
  try {
    const res = await updateEndpoint(endpoint.id, { is_active: val })
    if (res.success) {
      ElMessage.success(val ? '接口已启用' : '接口已禁用')
    }
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
    endpoint.is_active = !val
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 验证手动设置的 token
  if (form.tokenType === 'manual') {
    if (!form.token) {
      ElMessage.error('请输入令牌')
      return
    }
    if (form.token.length < 6) {
      ElMessage.error('令牌长度至少为6个字符')
      return
    }
    if (tokenValidation.status && !tokenValidation.valid) {
      ElMessage.error('该令牌已被使用，请更换')
      return
    }
  }

  formLoading.value = true
  try {
    if (editingEndpoint.value) {
      const res = await updateEndpoint(editingEndpoint.value.id, {
        name: form.name,
        description: form.description,
        token: form.tokenType === 'manual' ? form.token : null,
      })
      if (res.success) {
        // 更新渠道绑定
        if (form.channelIds.length > 0) {
          await updateEndpointChannels(editingEndpoint.value.id, form.channelIds)
        }
        ElMessage.success('更新成功')
      }
    } else {
      const res = await createEndpoint({
        name: form.name,
        description: form.description,
        token: form.tokenType === 'manual' ? form.token : undefined,
      })
      if (res.success) {
        // 绑定渠道
        if (form.channelIds.length > 0) {
          await updateEndpointChannels(res.data.id, form.channelIds)
        }
        ElMessage.success('创建成功')
      }
    }
    showCreateDialog.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

const resetForm = () => {
  editingEndpoint.value = null
  form.name = ''
  form.description = ''
  form.token = ''
  form.tokenType = 'auto'
  form.channelIds = []
  tokenValidation.status = false
  tokenValidation.valid = false
  tokenValidation.message = ''
}

// 入站配置相关方法
const inboundUrl = computed(() => {
  if (!inboundEditingEndpoint.value) return ''
  return `${window.location.origin}/api/inbound/${inboundEditingEndpoint.value.token}`
})

const openInboundConfig = (endpoint) => {
  inboundEditingEndpoint.value = endpoint
  
  // 重置表单
  inboundForm.enabled = endpoint.inbound_config?.enabled || false
  inboundForm.sourceType = endpoint.inbound_config?.sourceType || 'generic'
  inboundForm.fieldMapping = {
    title: endpoint.inbound_config?.fieldMapping?.title || '',
    content: endpoint.inbound_config?.fieldMapping?.content || '',
  }
  inboundForm.defaultValues = {
    type: endpoint.inbound_config?.defaultValues?.type || 'text',
    title: endpoint.inbound_config?.defaultValues?.title || '新消息',
  }
  
  // 设置测试数据
  const exampleData = inboundExampleData[inboundForm.sourceType]
  inboundTestData.value = exampleData ? JSON.stringify(exampleData, null, 2) : ''
  
  showInboundDrawer.value = true
}

const copyInboundUrl = () => {
  navigator.clipboard.writeText(`POST ${inboundUrl.value}`)
  ElMessage.success('接收地址已复制')
}

const saveInboundConfig = async () => {
  if (!inboundEditingEndpoint.value) return
  
  inboundSaving.value = true
  try {
    const config = inboundForm.enabled ? {
      enabled: true,
      sourceType: inboundForm.sourceType,
      fieldMapping: inboundForm.fieldMapping,
      defaultValues: inboundForm.defaultValues,
    } : { enabled: false }
    
    const res = await updateInboundConfig(inboundEditingEndpoint.value.id, config)
    if (res.success) {
      ElMessage.success('入站配置已保存')
      // 更新本地数据
      const index = endpoints.value.findIndex(e => e.id === inboundEditingEndpoint.value.id)
      if (index !== -1) {
        endpoints.value[index].inbound_config = config
      }
      showInboundDrawer.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    inboundSaving.value = false
  }
}

const testInbound = async () => {
  if (!inboundTestData.value.trim()) {
    ElMessage.warning('请输入测试数据')
    return
  }

  let testData
  try {
    testData = JSON.parse(inboundTestData.value)
  } catch (e) {
    ElMessage.error('JSON 格式错误')
    return
  }

  inboundTestLoading.value = true
  try {
    // 直接调用入站接口
    const response = await fetch(inboundUrl.value, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    })

    const result = await response.json()

    if (result.success) {
      ElMessage.success('测试推送成功')
    } else {
      ElMessage.warning(result.message || '部分推送失败')
    }
  } catch (error) {
    ElMessage.error(error.message || '测试失败')
  } finally {
    inboundTestLoading.value = false
  }
}

// 关键词过滤相关方法
const openKeywordFilter = (endpoint) => {
  keywordEditingEndpoint.value = endpoint

  // 重置表单并回填已有配置
  if (endpoint.keyword_filter?.enabled) {
    keywordForm.enabled = true
    keywordForm.mode = endpoint.keyword_filter.mode || 'blacklist'
    keywordForm.keywords = endpoint.keyword_filter.keywords?.length > 0
      ? [...endpoint.keyword_filter.keywords]
      : ['']
  } else {
    keywordForm.enabled = false
    keywordForm.mode = 'blacklist'
    keywordForm.keywords = ['']
  }

  showKeywordFilterDrawer.value = true
}

const addKeyword = () => {
  if (keywordForm.keywords.length < 50) {
    keywordForm.keywords.push('')
  }
}

const removeKeyword = (index) => {
  if (keywordForm.keywords.length > 1) {
    keywordForm.keywords.splice(index, 1)
  }
}

const saveKeywordFilter = async () => {
  if (!keywordEditingEndpoint.value) return

  // 启用时校验关键词
  if (keywordForm.enabled) {
    const validKeywords = keywordForm.keywords.filter(k => k && k.trim())
    if (validKeywords.length === 0) {
      ElMessage.warning('请至少输入一个有效关键词')
      return
    }
  }

  keywordSaving.value = true
  try {
    let config = null
    if (keywordForm.enabled) {
      const validKeywords = keywordForm.keywords.map(k => k.trim()).filter(k => k)
      config = {
        enabled: true,
        mode: keywordForm.mode,
        keywords: validKeywords,
      }
    }

    const res = await updateKeywordFilter(keywordEditingEndpoint.value.id, { ...config })
    if (res.success) {
      ElMessage.success(keywordForm.enabled ? '关键词过滤已启用' : '关键词过滤已关闭')
      // 更新本地数据
      const index = endpoints.value.findIndex(e => e.id === keywordEditingEndpoint.value.id)
      if (index !== -1) {
        endpoints.value[index].keyword_filter = config
      }
      showKeywordFilterDrawer.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    keywordSaving.value = false
  }
}

// 消息免打扰相关方法
const openDoNotDisturb = (endpoint) => {
  dndEditingEndpoint.value = endpoint

  // 重置表单并回填已有配置
  if (endpoint.do_not_disturb?.enabled && Array.isArray(endpoint.do_not_disturb.timeRanges) && endpoint.do_not_disturb.timeRanges.length > 0) {
    dndForm.enabled = true
    dndForm.timeRanges = endpoint.do_not_disturb.timeRanges.map(r => ({ ...r }))
  } else {
    dndForm.enabled = false
    dndForm.timeRanges = [{ start: '22:00', end: '08:00' }]
  }

  showDndDrawer.value = true
}

const addDndRange = () => {
  if (dndForm.timeRanges.length < 5) {
    dndForm.timeRanges.push({ start: '00:00', end: '00:00' })
  }
}

const removeDndRange = (index) => {
  if (dndForm.timeRanges.length > 1) {
    dndForm.timeRanges.splice(index, 1)
  }
}

const saveDoNotDisturb = async () => {
  if (!dndEditingEndpoint.value) return

  // 启用时校验时间段
  if (dndForm.enabled) {
    for (let i = 0; i < dndForm.timeRanges.length; i++) {
      const range = dndForm.timeRanges[i]
      if (!range.start || !range.end) {
        ElMessage.error(`第 ${i + 1} 个时间段不完整`)
        return
      }
      if (range.start === range.end) {
        ElMessage.error(`第 ${i + 1} 个时间段开始和结束时间不能相同`)
        return
      }
    }
  }

  dndSaving.value = true
  try {
    let config = null
    if (dndForm.enabled) {
      config = {
        enabled: true,
        timeRanges: dndForm.timeRanges.map(r => ({
          start: r.start,
          end: r.end,
        })),
      }
    }

    const res = await updateDoNotDisturb(dndEditingEndpoint.value.id, { ...config })
    if (res.success) {
      ElMessage.success(dndForm.enabled ? '免打扰配置已启用' : '免打扰功能已关闭')
      // 更新本地数据
      const index = endpoints.value.findIndex(e => e.id === dndEditingEndpoint.value.id)
      if (index !== -1) {
        endpoints.value[index].do_not_disturb = config
      }
      showDndDrawer.value = false
    }
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    dndSaving.value = false
  }
}

// 监听对话框关闭，重置表单
watch(showCreateDialog, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 监听数据来源类型变化，更新示例数据
watch(() => inboundForm.sourceType, (newType) => {
  const exampleData = inboundExampleData[newType]
  if (exampleData) {
    inboundTestData.value = JSON.stringify(exampleData, null, 2)
  }
})

onMounted(() => {
  loadData()
})
</script>
