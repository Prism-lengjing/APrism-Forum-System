import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useForumStore } from '../store/forumStore'
import { useAuthStore } from '../store/authStore'
import type { ForumItem } from '../types/forum'

function ForumCard({ forum }: { forum: ForumItem }) {
  return (
    <Link
      to={`/forums/${forum.id}`}
      className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          {forum.icon ? `${forum.icon} ` : ''}
          {forum.name}
        </h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          {forum.slug}
        </span>
      </div>

      <p className="mb-4 text-sm text-gray-600">
        {forum.description || '暂无板块描述'}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>{forum.threadCount} 主题</span>
        <span>{forum.postCount} 帖子</span>
      </div>
    </Link>
  )
}

export default function ForumListPage() {
  const {
    categories,
    forums,
    loading,
    error,
    fetchCategories,
    fetchForums,
  } = useForumStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  useEffect(() => {
    void fetchCategories()
    void fetchForums()
  }, [fetchCategories, fetchForums])

  const groupedForums = useMemo(() => {
    const map = new Map<number, ForumItem[]>()
    for (const forum of forums) {
      const group = map.get(forum.categoryId)
      if (group) {
        group.push(forum)
      } else {
        map.set(forum.categoryId, [forum])
      }
    }
    return map
  }, [forums])

  if (loading && forums.length === 0) {
    return <div className="text-sm text-gray-500">正在加载板块...</div>
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">论坛板块</h1>
        <p className="mt-2 text-sm text-gray-600">
          Phase 1 已接入真实 API 与状态管理。当前可浏览板块、主题与帖子。
        </p>
        {!isAuthenticated && (
          <p className="mt-3 text-sm text-blue-600">
            你还未登录，登录后可以发布主题和回复。
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {categories.map((category) => {
        const forumsInCategory = groupedForums.get(category.id) || []
        return (
          <section key={category.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900">
                {category.icon ? `${category.icon} ` : ''}
                {category.name}
              </h2>
              <span className="text-xs text-gray-500">
                {forumsInCategory.length} / {category.forumCount} 板块
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {forumsInCategory.map((forum) => (
                <ForumCard key={forum.id} forum={forum} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
