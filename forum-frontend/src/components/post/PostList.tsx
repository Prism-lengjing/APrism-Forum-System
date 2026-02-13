import UserCard from '../common/UserCard'
import type { PostItem } from '../../types/post'

interface PostListProps {
  posts: PostItem[]
}

export default function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return <p className="text-sm text-gray-500">还没有回复，来抢沙发吧。</p>
  }

  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <article
          key={post.id}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <UserCard
              username={post.author.username}
              avatar={post.author.avatar}
              secondary={`Lv.${post.author.level}`}
            />
            <div className="text-sm font-medium text-gray-900">{post.floor} 楼</div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{post.content}</p>
        </article>
      ))}
    </div>
  )
}
