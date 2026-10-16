<template>
  <div class="space-y-6 animate-fade-in">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">用户管理</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">管理系统用户信息，仅管理员可访问</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">
        <Plus class="w-4 h-4 mr-1" />
        新建用户
      </el-button>
    </div>

    <!-- 搜索栏 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索用户名或邮箱..."
        class="max-w-md"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          <Search class="w-4 h-4 text-gray-400" />
        </template>
      </el-input>
    </div>

    <!-- 用户列表 -->
    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div
        v-for="user in users"
        :key="user.id"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <el-avatar
              :size="48"
              :src="user.avatar"
              class="bg-gradient-to-br from-blue-500 to-purple-600"
            >
              {{ user.username?.charAt(0)?.toUpperCase() || 'U' }}
            </el-avatar>
            <div>
              <h3 class="font-semibold text-gray-900 dark:text-white">{{ user.username }}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">{{ user.email }}</p>
            </div>
          </div>
          <el-dropdown @command="(cmd) => handleCommand(cmd, user)">
            <el-button text>
              <MoreVertical class="w-4 h-4" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="edit">
                  <Edit class="w-4 h-4 mr-2" />
                  编辑
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <Key class="w-4 h-4 mr-2" />
                  重置密码
                </el-dropdown-item>
                <el-dropdown-item divided command="delete">
                  <Trash2 class="w-4 h-4 mr-2" />
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <!-- 用户信息 -->
        <div class="space-y-2 mb-4">
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">角色</span>
            <el-tag
              :type="user.role === 'admin' ? 'primary' : 'info'"
              size="small"
              effect="dark"
            >
              {{ user.role === 'admin' ? '管理员' : '普通用户' }}
            </el-tag>
          </div>
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-500 dark:text-gray-400">创建时间</span>
            <span class="text-gray-700 dark:text-gray-300">{{ formatDate(user.created_at) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="users.length === 0" class="text-center py-16">
      <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
        <Users class="w-10 h-10 text-blue-500" />
      </div>
      <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无用户</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-4">创建您的第一个用户</p>
      <el-button type="primary" @click="openCreateDialog">
        <Plus class="w-4 h-4 mr-1" />
        新建用户
      </el-button>
    </div>

    <!-- 分页 -->
    <div v-if="total > 0" class="flex justify-center pt-4">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editingUser ? '编辑用户' : '新建用户'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-position="top"
      >
        <el-form-item label="头像链接" prop="avatar">
          <el-input v-model="form.avatar" placeholder="请输入头像图片链接（可选）" />
        </el-form-item>

        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="!!editingUser" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱地址" />
        </el-form-item>

        <el-form-item
          v-if="!editingUser"
          label="密码"
          prop="password"
        >
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="选择用户角色" class="w-full">
            <el-option label="普通用户" value="user" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="formLoading" @click="handleSubmit">
          {{ editingUser ? '保存' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="showResetPasswordDialog"
      title="重置密码"
      width="400px"
    >
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        正在为 <strong>{{ selectedUser?.username }}</strong> 重置密码
      </p>
      <el-form
        ref="passwordFormRef"
        :model="passwordForm"
        :rules="passwordRules"
        label-position="top"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="passwordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showResetPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="passwordLoading" @click="handleResetPassword">
          确认重置
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '@/api/admin'
import {
  Plus,
  Users,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Search,
} from 'lucide-vue-next'

const users = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const showResetPasswordDialog = ref(false)
const formLoading = ref(false)
const passwordLoading = ref(false)
const editingUser = ref(null)
const selectedUser = ref(null)

const formRef = ref(null)
const passwordFormRef = ref(null)

const form = reactive({
  avatar: '',
  username: '',
  email: '',
  password: '',
  role: 'user',
})

const passwordForm = reactive({
  newPassword: '',
})

const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在2-20位之间', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于6位', trigger: 'blur' },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
}

const passwordRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于6位', trigger: 'blur' },
  ],
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

const loadUsers = async () => {
  try {
    const res = await getUsers({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value,
    })
    if (res.success) {
      users.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    ElMessage.error('加载用户列表失败')
  }
}

const handleSearch = () => {
  page.value = 1
  loadUsers()
}

const handlePageChange = () => {
  loadUsers()
}

const handleSizeChange = () => {
  page.value = 1
  loadUsers()
}

const handleCommand = (command, user) => {
  if (command === 'edit') {
    editingUser.value = user
    form.avatar = user.avatar || ''
    form.username = user.username
    form.email = user.email
    form.password = ''
    form.role = user.role
    showCreateDialog.value = true
  } else if (command === 'password') {
    selectedUser.value = user
    passwordForm.newPassword = ''
    showResetPasswordDialog.value = true
  } else if (command === 'delete') {
    handleDelete(user)
  }
}

const handleDelete = async (user) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户 "${user.username}" 吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    const res = await deleteUser(user.id)
    if (res.success) {
      ElMessage.success('删除成功')
      loadUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  formLoading.value = true
  try {
    if (editingUser.value) {
      const res = await updateUser(editingUser.value.id, {
        avatar: form.avatar,
        email: form.email,
        role: form.role,
      })
      if (res.success) {
        ElMessage.success('更新成功')
      }
    } else {
      const res = await createUser({
        avatar: form.avatar,
        username: form.username,
        email: form.email,
        password: form.password,
        role: form.role,
      })
      if (res.success) {
        ElMessage.success('创建成功')
      }
    }
    showCreateDialog.value = false
    resetForm()
    loadUsers()
  } catch (error) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    formLoading.value = false
  }
}

const handleResetPassword = async () => {
  const valid = await passwordFormRef.value?.validate().catch(() => false)
  if (!valid) return

  passwordLoading.value = true
  try {
    const res = await resetPassword(selectedUser.value.id, passwordForm.newPassword)
    if (res.success) {
      ElMessage.success('密码重置成功')
      showResetPasswordDialog.value = false
      passwordForm.newPassword = ''
    }
  } catch (error) {
    ElMessage.error(error.message || '重置密码失败')
  } finally {
    passwordLoading.value = false
  }
}

const resetForm = () => {
  editingUser.value = null
  form.avatar = ''
  form.username = ''
  form.email = ''
  form.password = ''
  form.role = 'user'
}

const openCreateDialog = () => {
  resetForm()
  showCreateDialog.value = true
}

onMounted(() => {
  loadUsers()
})
</script>
