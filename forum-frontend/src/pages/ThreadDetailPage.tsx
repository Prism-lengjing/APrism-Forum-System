import { type FormEvent, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import PostList from '../components/post/PostList'
import ReplyBox from '../components/post/ReplyBox'
import { useAuthStore } from '../store/authStore'
import { usePostStore } from '../store/postStore'
import { useThreadStore } from '../store/threadStore'

export default function ThreadDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const threadId = Number(params.id)

  const { currentThread, loading: loadingThread, fetchThreadById } = useThreadStore()
  const {
    postPage,
    loading: loadingPosts,
    creating: creatingPost,
    fetchThreadPosts,
    createPost,
  } = usePostStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [page, setPage] = useState(1)
  const [replyContent, setReplyContent] = useState('')

  useEffect(() => {
    if (!Number.isFinite(threadId) || threadId < 1) {
      return
    }
    void fetchThreadById(threadId)
    void fetchThreadPosts(threadId, page, 30)
  }, [fetchThreadById, fetchThreadPosts, page, threadId])

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAuthenticated) {
      toast.error('请先登录')
      navigate('/login')
      return
    }

    try {
      await createPost({ threadId, content: replyContent })
      setReplyContent('')
      setPage(1)
      await fetchThreadById(threadId)
      await fetchThreadPosts(threadId, 1, 30)
      toast.success('回复成功')
    } catch {
      toast.error('回复失败')
    }
  }

  if (!Number.isFinite(threadId) || threadId < 1) {
    return <div className="text-sm text-red-600">主题 ID 无效</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs text-gray-500">
          <Link to="/forums" className="hover:text-gray-700">
            论坛板块
          </Link>
          {currentThread && (
            <>
              {' / '}
              <Link to={`/forums/${currentThread.forumId}`} className="hover:text-gray-700">
                {currentThread.forum.name}
              </Link>
            </>
          )}
        </p>

        {loadingThread && !currentThread ? (
          <p className="mt-3 text-sm text-gray-500">正在加载主题...</p>
        ) : currentThread ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">
              {currentThread.title}
            </h1>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>作者: {currentThread.author.username}</span>
              <span>浏览: {currentThread.viewCount}</span>
              <span>回复: {currentThread.replyCount}</span>
            </div>
            <article className="mt-5 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
              {currentThread.content}
            </article>
          </>
        ) : (
          <p className="mt-3 text-sm text-red-600">主题不存在</p>
        )}
      </section>

      <ReplyBox
        content={replyContent}
        onContentChange={setReplyContent}
        onSubmit={handleReply}
        submitting={creatingPost}
        disabled={!isAuthenticated}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          回复列表 {postPage ? `(${postPage.total})` : ''}
        </h2>
        {loadingPosts && !postPage ? (
          <p className="text-sm text-gray-500">正在加载回复...</p>
        ) : (
          <PostList posts={postPage?.items ?? []} />
        )}
      </section>

      <Pagination
        page={page}
        totalPages={postPage?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  )
}
