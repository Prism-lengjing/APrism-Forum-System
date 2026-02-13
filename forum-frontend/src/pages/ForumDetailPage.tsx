import { type FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import ThreadEditor from '../components/thread/ThreadEditor'
import ThreadList from '../components/thread/ThreadList'
import { useAuthStore } from '../store/authStore'
import { useForumStore } from '../store/forumStore'
import { useThreadStore } from '../store/threadStore'

export default function ForumDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const forumId = Number(params.id)

  const {
    currentForum,
    threadPage,
    loading,
    error,
    fetchForumById,
    fetchForumThreads,
  } = useForumStore()
  const createThread = useThreadStore((state) => state.createThread)
  const creatingThread = useThreadStore((state) => state.creating)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [page, setPage] = useState(1)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    if (!Number.isFinite(forumId) || forumId < 1) {
      return
    }
    void fetchForumById(forumId)
  }, [fetchForumById, forumId])

  useEffect(() => {
    if (!Number.isFinite(forumId) || forumId < 1) {
      return
    }
    void fetchForumThreads(forumId, page, 20)
  }, [fetchForumThreads, forumId, page])

  const totalPages = useMemo(() => threadPage?.totalPages ?? 1, [threadPage])

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAuthenticated) {
      toast.error('请先登录')
      navigate('/login')
      return
    }

    try {
      const created = await createThread({
        forumId,
        title,
        content,
        type: 'normal',
      })
      toast.success('主题已创建')
      setTitle('')
      setContent('')
      await fetchForumThreads(forumId, 1, 20)
      navigate(`/threads/${created.id}`)
    } catch {
      toast.error('创建主题失败')
    }
  }

  if (!Number.isFinite(forumId) || forumId < 1) {
    return <div className="text-sm text-red-600">板块 ID 无效</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs text-gray-500">
          <Link to="/forums" className="hover:text-gray-700">
            论坛板块
          </Link>
          {' / '}
          {currentForum?.name || '板块详情'}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          {currentForum?.icon ? `${currentForum.icon} ` : ''}
          {currentForum?.name || '加载中...'}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          {currentForum?.description || '暂无描述'}
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      <ThreadEditor
        title={title}
        content={content}
        onTitleChange={setTitle}
        onContentChange={setContent}
        onSubmit={handleCreateThread}
        submitting={creatingThread}
        disabled={!isAuthenticated}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">
          主题列表 {threadPage ? `(${threadPage.total})` : ''}
        </h2>
        {loading && !threadPage ? (
          <p className="text-sm text-gray-500">正在加载主题...</p>
        ) : (
          <ThreadList threads={threadPage?.items ?? []} />
        )}
      </section>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
