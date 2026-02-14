import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import { useLeaderboardStore } from '../store/leaderboardStore'
import type { LeaderboardPeriod } from '../types/points'

const PERIOD_OPTIONS: Array<{ label: string; value: LeaderboardPeriod }> = [
  { label: '全部', value: 'all' },
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
]

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">#1</span>
  }
  if (rank === 2) {
    return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">#2</span>
  }
  if (rank === 3) {
    return <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700">#3</span>
  }
  return <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">#{rank}</span>
}

function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`loading-${index}`}
          className="h-12 animate-pulse rounded-xl border border-gray-200 bg-gray-100"
        />
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const {
    pointsBoard,
    signinBoard,
    period,
    loadingPoints,
    loadingSignin,
    error,
    fetchPointsBoard,
    fetchSigninBoard,
    setPeriod,
  } = useLeaderboardStore()

  useEffect(() => {
    void Promise.all([fetchPointsBoard(1, 20, period), fetchSigninBoard(1, 20, period)]).catch(() => {
      // Error is stored and displayed by the page.
    })
  }, [fetchPointsBoard, fetchSigninBoard, period])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">排行榜</h1>
        <p className="mt-2 text-sm text-gray-600">展示当前积分与签到表现最突出的用户。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {PERIOD_OPTIONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                void setPeriod(item.value)
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                period === item.value
                  ? 'border-blue-300 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">积分榜</h2>
        {loadingPoints && !pointsBoard ? (
          <LoadingRows />
        ) : pointsBoard && pointsBoard.items.length > 0 ? (
          <>
            <div className="mt-3 space-y-2">
              {pointsBoard.items.map((item) => (
                <div
                  key={`points-${item.userId}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <RankBadge rank={item.rank} />
                    <Link
                      to={`/users/${item.userId}`}
                      className="font-medium text-gray-900 hover:text-blue-700"
                    >
                      {item.username}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>Lv.{item.level}</span>
                    <span>EXP {item.experience}</span>
                    <span>周期积分 {item.score}</span>
                    <span>{item.threadCount} 主题</span>
                    <span>{item.postCount} 回复</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={pointsBoard.page}
                totalPages={pointsBoard.totalPages}
                onPageChange={(nextPage) => {
                  void fetchPointsBoard(nextPage, pointsBoard.pageSize, period)
                }}
              />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">暂无数据</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">签到榜</h2>
        {loadingSignin && !signinBoard ? (
          <LoadingRows />
        ) : signinBoard && signinBoard.items.length > 0 ? (
          <>
            <div className="mt-3 space-y-2">
              {signinBoard.items.map((item) => (
                <div
                  key={`signin-${item.userId}`}
                  className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <RankBadge rank={item.rank} />
                    <Link
                      to={`/users/${item.userId}`}
                      className="font-medium text-gray-900 hover:text-blue-700"
                    >
                      {item.username}
                    </Link>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <span>最高连签 {item.bestStreak} 天</span>
                    <span>累计签到 {item.totalSigninDays} 天</span>
                    <span>最近签到 {item.lastSignDate || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Pagination
                page={signinBoard.page}
                totalPages={signinBoard.totalPages}
                onPageChange={(nextPage) => {
                  void fetchSigninBoard(nextPage, signinBoard.pageSize, period)
                }}
              />
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-gray-500">暂无签到数据</p>
        )}
      </section>
    </div>
  )
}
