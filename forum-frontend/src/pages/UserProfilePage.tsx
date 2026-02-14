import axios from 'axios'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { badgeService } from '../services/badgeService'
import { userService } from '../services/userService'
import type { UserBadgeItem } from '../types/badge'
import type { PublicUserProfile } from '../types/user'

export default function UserProfilePage() {
  const params = useParams<{ id: string }>()
  const userId = Number(params.id)

  const [profile, setProfile] = useState<PublicUserProfile | null>(null)
  const [badges, setBadges] = useState<UserBadgeItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!Number.isFinite(userId) || userId < 1) {
      return
    }

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const [nextProfile, nextBadges] = await Promise.all([
          userService.getPublicProfile(userId),
          badgeService.getUserBadges(userId),
        ])
        if (cancelled) {
          return
        }
        setProfile(nextProfile)
        setBadges(nextBadges)
      } catch (error) {
        if (!cancelled) {
          if (axios.isAxiosError(error)) {
            if (error.response?.status === 404) {
              setNotFound(true)
            } else if (!error.response) {
              setError('网络错误，请检查连接后重试')
            } else {
              setError('加载用户资料失败')
            }
          } else {
            setError('加载用户资料失败')
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (!Number.isFinite(userId) || userId < 1) {
    return <div className="text-sm text-red-600">用户 ID 无效</div>
  }

  if (loading && !profile) {
    return <div className="text-sm text-gray-500">加载中...</div>
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>
  }

  if (notFound || !profile) {
    return <div className="text-sm text-gray-500">用户不存在</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs text-gray-500">
          <Link to="/forums" className="hover:text-gray-700">
            论坛板块
          </Link>
          {' / '}
          用户主页
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{profile.username}</h1>
            <p className="mt-2 text-sm text-gray-600">{profile.bio || '这个人很神秘，什么都没写。'}</p>
          </div>
          <div className="rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
            Lv.{profile.level} / EXP {profile.experience}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
          <span className="rounded-full bg-gray-100 px-2 py-1">{profile.threadCount} 主题</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">{profile.postCount} 回复</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">角色: {profile.role}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">
            加入时间: {profile.createdAt.slice(0, 10)}
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">徽章墙</h2>
        {badges.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">暂无徽章</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="rounded-xl border border-gray-200 p-4"
                title={`${badge.name} · ${badge.description || ''}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{badge.icon || '🏅'}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{badge.name}</p>
                    <p className="text-xs text-gray-500">{badge.description || '成就徽章'}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500">获得时间: {badge.awardedAt.slice(0, 10)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
