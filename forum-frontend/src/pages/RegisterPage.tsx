import { type FormEvent, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error } = useAuthStore()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await register(username, email, password)
      toast.success('注册成功，已自动登录')
      navigate('/forums', { replace: true })
    } catch {
      toast.error('注册失败，请检查输入信息')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">创建账号</h1>
      <p className="mt-1 text-sm text-gray-600">注册后即可发布主题、参与回复。</p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="用户名（3-50 字符）"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={50}
          required
        />
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          type="email"
          placeholder="邮箱"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          type="password"
          placeholder="密码（至少 6 位）"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          maxLength={64}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={loading}
        >
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        已有账号？{' '}
        <Link to="/login" className="text-blue-600 hover:text-blue-500">
          去登录
        </Link>
      </p>
    </div>
  )
}
