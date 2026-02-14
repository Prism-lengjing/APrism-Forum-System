import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { TOKEN_KEY } from './services/api'
import { notificationService } from './services/notificationService'
import { useAuthStore } from './store/authStore'
import { useBadgeStore } from './store/badgeStore'
import { useNotificationStore } from './store/notificationStore'
import { usePointsStore } from './store/pointsStore'
import type { NotificationItem, NotificationStreamEvent } from './types/notification'

const ForumListPage = lazy(() => import('./pages/ForumListPage'))
const ForumDetailPage = lazy(() => import('./pages/ForumDetailPage'))
const ThreadDetailPage = lazy(() => import('./pages/ThreadDetailPage'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'))
const UserProfilePage = lazy(() => import('./pages/UserProfilePage'))
const PointsCenterPage = lazy(() => import('./pages/PointsCenterPage'))
const NotificationSettingsPage = lazy(() => import('./pages/NotificationSettingsPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))

function AppHeader() {
  const { isAuthenticated, user, token, logout } = useAuthStore()
  const [showNotifications, setShowNotifications] = useState(false)
  const showNotificationsRef = useRef(showNotifications)

  const summary = usePointsStore((state) => state.summary)
  const loadingSummary = usePointsStore((state) => state.loadingSummary)
  const signingIn = usePointsStore((state) => state.signingIn)
  const fetchSummary = usePointsStore((state) => state.fetchSummary)
  const signin = usePointsStore((state) => state.signin)
  const resetPoints = usePointsStore((state) => state.reset)
  const myBadges = useBadgeStore((state) => state.myBadges)
  const loadingMyBadges = useBadgeStore((state) => state.loadingMyBadges)
  const fetchMyBadges = useBadgeStore((state) => state.fetchMyBadges)
  const resetBadges = useBadgeStore((state) => state.reset)

  const notificationPage = useNotificationStore((state) => state.page)
  const unreadCount = useNotificationStore((state) => state.unreadCount)
  const loadingNotificationPage = useNotificationStore((state) => state.loadingPage)
  const loadingUnreadCount = useNotificationStore((state) => state.loadingUnreadCount)
  const markingAllRead = useNotificationStore((state) => state.markingAllRead)
  const markingIds = useNotificationStore((state) => state.markingIds)
  const fetchNotifications = useNotificationStore((state) => state.fetchPage)
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount)
  const markAllNotificationsRead = useNotificationStore((state) => state.markAllAsRead)
  const markNotificationRead = useNotificationStore((state) => state.markAsRead)
  const resetNotifications = useNotificationStore((state) => state.reset)

  useEffect(() => {
    if (!isAuthenticated) {
      resetPoints()
      resetBadges()
      resetNotifications()
      return
    }

    void Promise.all([fetchSummary(), fetchMyBadges(), fetchUnreadCount()]).catch(() => {
      // Keep header resilient; explicit errors are shown on specific actions.
    })
  }, [
    fetchSummary,
    fetchMyBadges,
    fetchUnreadCount,
    isAuthenticated,
    resetBadges,
    resetNotifications,
    resetPoints,
  ])

  useEffect(() => {
    if (!isAuthenticated || !showNotifications) {
      return
    }
    void fetchNotifications(1, 8, false).catch(() => {
      // Keep header rendering even if notification request fails.
    })
  }, [fetchNotifications, isAuthenticated, showNotifications])

  useEffect(() => {
    showNotificationsRef.current = showNotifications
  }, [showNotifications])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const authToken = token || localStorage.getItem(TOKEN_KEY)
    if (!authToken) {
      return
    }

    const stream = notificationService.createStream(authToken)
    stream.onmessage = (event) => {
      let payload: NotificationStreamEvent | null = null
      try {
        payload = JSON.parse(event.data) as NotificationStreamEvent
      } catch {
        payload = null
      }

      if (!payload || typeof payload.unreadCount !== 'number') {
        return
      }

      void fetchUnreadCount().catch(() => {
        // Ignore transient refresh failures.
      })
      if (showNotificationsRef.current) {
        void fetchNotifications(1, 8, false).catch(() => {
          // Ignore dropdown refresh failures from stream updates.
        })
      }
    }

    stream.onerror = () => {
      // EventSource retries automatically.
    }

    return () => {
      stream.close()
    }
  }, [fetchNotifications, fetchUnreadCount, isAuthenticated, token])

  function getNotificationHref(item: NotificationItem): string | null {
    if (item.relatedType === 'thread' && item.relatedId) {
      return `/threads/${item.relatedId}`
    }
    if (item.relatedType === 'user' && item.relatedId) {
      return `/users/${item.relatedId}`
    }
    return null
  }

  function handleNotificationClick(item: NotificationItem) {
    setShowNotifications(false)
    if (!item.isRead) {
      void markNotificationRead(item.id).catch(() => {
        // Keep navigation smooth even if mark-as-read fails.
      })
    }
  }

  async function handleMarkAllRead() {
    try {
      await markAllNotificationsRead()
    } catch {
      toast.error('全部已读失败，请稍后重试')
    }
  }

  async function handleSignin() {
    try {
      const result = await signin()
      await fetchMyBadges()
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
            论坛
          </Link>
          <Link to="/search" className="text-gray-600 hover:text-gray-900">
            搜索
          </Link>
          <Link to="/leaderboard" className="text-gray-600 hover:text-gray-900">
            排行榜
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/me/points" className="text-gray-600 hover:text-gray-900">
                积分中心
              </Link>
              <Link to="/me/messages" className="text-gray-600 hover:text-gray-900">
                私信
              </Link>
              <Link
                to="/me/notifications/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                通知设置
              </Link>
              <div className="relative">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50"
                  onClick={() => {
                    setShowNotifications((prev) => !prev)
                  }}
                >
                  通知
                  {!loadingUnreadCount && unreadCount > 0 && (
                    <span className="ml-2 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 z-30 mt-2 w-80 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">通知</p>
                        <Link
                          to="/me/notifications/settings"
                          className="text-xs text-gray-500 hover:text-blue-600"
                          onClick={() => {
                            setShowNotifications(false)
                          }}
                        >
                          设置
                        </Link>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-blue-600 hover:text-blue-500 disabled:opacity-50"
                        disabled={markingAllRead || unreadCount <= 0}
                        onClick={() => {
                          void handleMarkAllRead()
                        }}
                      >
                        {markingAllRead ? '处理中...' : '全部已读'}
                      </button>
                    </div>
                    {loadingNotificationPage && !notificationPage ? (
                      <p className="text-sm text-gray-500">加载中...</p>
                    ) : notificationPage && notificationPage.items.length > 0 ? (
                      <div className="max-h-80 space-y-2 overflow-y-auto">
                        {notificationPage.items.map((item) => {
                          const href = getNotificationHref(item)
                          return (
                            <div
                              key={item.id}
                              className={`rounded-lg border px-3 py-2 ${
                                item.isRead
                                  ? 'border-gray-200 bg-gray-50'
                                  : 'border-blue-200 bg-blue-50'
                              }`}
                            >
                              {href ? (
                                <Link
                                  to={href}
                                  className="block hover:opacity-90"
                                  onClick={() => {
                                    handleNotificationClick(item)
                                  }}
                                >
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  {item.content && (
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                      {item.content}
                                    </p>
                                  )}
                                </Link>
                              ) : (
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{item.title}</p>
                                  {item.content && (
                                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                                      {item.content}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-gray-500">{item.createdAt}</span>
                                {!item.isRead && (
                                  <button
                                    type="button"
                                    className="text-xs text-blue-600 hover:text-blue-500 disabled:opacity-50"
                                    disabled={markingIds.includes(item.id)}
                                    onClick={() => {
                                      void markNotificationRead(item.id)
                                    }}
                                  >
                                    {markingIds.includes(item.id) ? '处理中...' : '标记已读'}
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">暂无通知</p>
                    )}
                  </div>
                )}
              </div>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                Lv.{summary?.level ?? user?.level ?? 1}
              </span>
              <span className="text-gray-500">
                EXP {summary?.experience ?? user?.experience ?? 0}
              </span>
              <span className="text-gray-500">
                {loadingMyBadges ? 'Badge...' : `Badge ${myBadges.length}`}
              </span>
              {myBadges.length > 0 && (
                <span
                  className="text-base leading-none"
                  title={myBadges.map((badge) => badge.name).join(', ')}
                >
                  {myBadges
                    .slice(0, 3)
                    .map((badge) => badge.icon || '*')
                    .join(' ')}
                </span>
              )}
              <button
                type="button"
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => {
                  void handleSignin()
                }}
                disabled={signingIn || loadingSummary || (summary ? !summary.canSignInToday : true)}
              >
                {loadingSummary
                  ? '加载中...'
                  : signingIn
                    ? '签到中...'
                    : summary && !summary.canSignInToday
                      ? `今日已签到 (${summary.currentStreak} 天)`
                      : '每日签到'}
              </button>
              <Link
                to={user ? `/users/${user.id}` : '/forums'}
                className="text-gray-500 hover:text-gray-700"
              >
                Hi, {user?.username}
              </Link>
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
              <Route path="/search" element={<SearchPage />} />
              <Route path="/threads/:id" element={<ThreadDetailPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/users/:id" element={<UserProfilePage />} />
              <Route path="/me/points" element={<PointsCenterPage />} />
              <Route path="/me/messages" element={<MessagesPage />} />
              <Route
                path="/me/notifications/settings"
                element={<NotificationSettingsPage />}
              />
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
