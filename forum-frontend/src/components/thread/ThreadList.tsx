import { Link } from 'react-router-dom'
import UserCard from '../common/UserCard'
import type { ThreadSummary } from '../../types/thread'

interface ThreadListProps {
  threads: ThreadSummary[]
}

export default function ThreadList({ threads }: ThreadListProps) {
  if (threads.length === 0) {
    return <p className="text-sm text-gray-500">暂无主题，欢迎发布第一帖。</p>
  }

  return (
    <div className="space-y-3">
      {threads.map((thread) => (
        <Link
          key={thread.id}
          to={`/threads/${thread.id}`}
          className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2">
            {thread.isPinned && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                置顶
              </span>
            )}
            <h3 className="text-base font-medium text-gray-900">{thread.title}</h3>
          </div>
          <p className="line-clamp-2 text-sm text-gray-600">{thread.excerpt}</p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <UserCard username={thread.author.username} avatar={thread.author.avatar} />
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>浏览: {thread.viewCount}</span>
              <span>回复: {thread.replyCount}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
