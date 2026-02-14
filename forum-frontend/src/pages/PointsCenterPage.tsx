import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import { useAuthStore } from '../store/authStore'
import { usePointsStore } from '../store/pointsStore'

export default function PointsCenterPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const summary = usePointsStore((state) => state.summary)
  const logsPage = usePointsStore((state) => state.logsPage)
  const loadingSummary = usePointsStore((state) => state.loadingSummary)
  const loadingLogs = usePointsStore((state) => state.loadingLogs)
  const error = usePointsStore((state) => state.error)
  const fetchSummary = usePointsStore((state) => state.fetchSummary)
  const fetchLogs = usePointsStore((state) => state.fetchLogs)

  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    void fetchSummary().catch(() => {
      // Error state is already captured in store.
    })
  }, [fetchSummary, isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }
    void fetchLogs(page, 20).catch(() => {
      // Error state is already captured in store.
    })
  }, [fetchLogs, isAuthenticated, page])

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-600">
          请先
          {' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-500">
            登录
          </Link>
          {' '}
          后查看积分中心。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">积分中心</h1>
        {loadingSummary && !summary ? (
          <p className="mt-3 text-sm text-gray-500">加载中...</p>
        ) : summary ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">等级</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">Lv.{summary.level}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">总经验</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{summary.experience}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">连签天数</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{summary.currentStreak}</p>
            </div>
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">下级目标</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{summary.nextLevelExperience}</p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">暂无积分数据</p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">积分明细</h2>
        {loadingLogs && !logsPage ? (
          <p className="mt-3 text-sm text-gray-500">加载中...</p>
        ) : logsPage && logsPage.items.length > 0 ? (
          <>
            <div className="mt-3 space-y-2">
              {logsPage.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.reason || item.action}</p>
                    <p className="text-xs text-gray-500">{item.createdAt}</p>
                  </div>
                  <div
                    className={`text-sm font-semibold ${
                      item.points >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {item.points >= 0 ? '+' : ''}
                    {item.points}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={logsPage.page}
                totalPages={logsPage.totalPages}
                onPageChange={setPage}
              />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">暂无积分记录</p>
        )}
      </section>
    </div>
  )
}
