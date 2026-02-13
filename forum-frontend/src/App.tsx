import { Suspense, lazy, useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { usePointsStore } from './store/pointsStore'

const ForumListPage = lazy(() => import('./pages/ForumListPage'))
const ForumDetailPage = lazy(() => import('./pages/ForumDetailPage'))
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

function AppHeader() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const summary = usePointsStore((state) => state.summary)
  const loadingSummary = usePointsStore((state) => state.loadingSummary)
  const signingIn = usePointsStore((state) => state.signingIn)
  const fetchSummary = usePointsStore((state) => state.fetchSummary)
  const signin = usePointsStore((state) => state.signin)
  const resetPoints = usePointsStore((state) => state.reset)

  useEffect(() => {
    if (!isAuthenticated) {
      resetPoints()
      return
    }

    void fetchSummary().catch(() => {
      // Keep header resilient; explicit errors are shown on sign-in action.
    })
  }, [fetchSummary, isAuthenticated, resetPoints])

  async function handleSignin() {
    try {
      const result = await signin()
      toast.success(`签到成功 +${result.pointsAwarded} 经验`)
    } catch {
      toast.error('签到失败，可能今日已签到')
    }
  }

  return (
    <header className="border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/forums" className="text-lg font-semibold text-gray-900">
          APrism Forum
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          <Link to="/forums" className="text-gray-600 hover:text-gray-900">
            论坛板块
          </Link>
          {isAuthenticated ? (
            <>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                Lv.{summary?.level ?? user?.level ?? 1}
              </span>
              <span className="text-gray-500">
                EXP {summary?.experience ?? user?.experience ?? 0}
              </span>
              <button
                type="button"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void handleSignin()
                }}
                disabled={
                  signingIn ||
                  loadingSummary ||
                  (summary ? !summary.canSignInToday : true)
                }
              >
                {loadingSummary
                  ? '加载中...'
                  : signingIn
                    ? '签到中...'
                    : summary && !summary.canSignInToday
                      ? `已签到 ${summary.currentStreak} 天`
                      : '每日签到'}
              </button>
              <span className="text-gray-500">Hi, {user?.username}</span>
              <button
                type="button"
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                onClick={logout}
              >
                退出
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="text-gray-600 hover:text-gray-900">
                登录
              </Link>
              <Link
                to="/register"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-500"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

function App() {
  const hydrate = useAuthStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <AppHeader />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">
          <Suspense fallback={<div className="text-sm text-gray-500">页面加载中...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/forums" replace />} />
              <Route path="/forums" element={<ForumListPage />} />
              <Route path="/forums/:id" element={<ForumDetailPage />} />
              <Route path="/threads/:id" element={<ThreadDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/forums" replace />} />
            </Routes>
          </Suspense>
        </main>
        <Toaster position="top-right" />
      </div>
    </BrowserRouter>
  )
}

export default App
