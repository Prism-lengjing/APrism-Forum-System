import { type FormEvent, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error } = useAuthStore()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  const redirectTo =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/forums'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    try {
      await login(identifier, password)
      toast.success('登录成功')
      navigate(redirectTo, { replace: true })
    } catch {
      toast.error('登录失败，请检查账号或密码')
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">登录账号</h1>
      <p className="mt-1 text-sm text-gray-600">
        可使用用户名或邮箱登录（测试账号：testuser / password123）
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="用户名或邮箱"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          required
        />
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={loading}
        >
          {loading ? '登录中...' : '登录'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">
        还没有账号？{' '}
        <Link to="/register" className="text-blue-600 hover:text-blue-500">
          立即注册
        </Link>
      </p>
    </div>
  )
}
