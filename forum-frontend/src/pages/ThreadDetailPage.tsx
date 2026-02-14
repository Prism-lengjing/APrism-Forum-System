import { type FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import PostList from '../components/post/PostList'
import ReplyBox from '../components/post/ReplyBox'
import { forumService } from '../services/forumService'
import { useAuthStore } from '../store/authStore'
import { usePostStore } from '../store/postStore'
import { useThreadStore } from '../store/threadStore'
import type { ForumItem, ModeratorActionLogItem } from '../types/forum'
import type { ModerateThreadInput } from '../types/thread'

export default function ThreadDetailPage() {
  const navigate = useNavigate()
  const params = useParams<{ id: string }>()
  const threadId = Number(params.id)

  const {
    currentThread,
    loading: loadingThread,
    moderating,
    moving,
    fetchThreadById,
    moderateThread,
    moveThread,
  } = useThreadStore()
  const {
    postPage,
    loading: loadingPosts,
    creating: creatingPost,
    fetchThreadPosts,
    createPost,
  } = usePostStore()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentUser = useAuthStore((state) => state.user)

  const [page, setPage] = useState(1)
  const [replyContent, setReplyContent] = useState('')
  const [moderatorIds, setModeratorIds] = useState<number[]>([])
  const [loadingModerators, setLoadingModerators] = useState(false)
  const [forumOptions, setForumOptions] = useState<ForumItem[]>([])
  const [targetForumId, setTargetForumId] = useState<number | ''>('')
  const [moderatorLogs, setModeratorLogs] = useState<ModeratorActionLogItem[]>([])
  const [loadingModeratorLogs, setLoadingModeratorLogs] = useState(false)

  const isAdmin = currentUser?.role === 'admin'
  const canModerate = Boolean(
    isAuthenticated && currentUser && (isAdmin || moderatorIds.includes(currentUser.id))
  )
  const currentForumId = currentThread?.forumId ?? null
  const currentThreadUpdatedAt = currentThread?.updatedAt ?? null

  useEffect(() => {
    if (!Number.isFinite(threadId) || threadId < 1) {
      return
    }
    void fetchThreadById(threadId)
    void fetchThreadPosts(threadId, page, 30)
  }, [fetchThreadById, fetchThreadPosts, page, threadId])

  useEffect(() => {
    if (!currentThread || !isAuthenticated || !currentUser || isAdmin) {
      return
    }

    let cancelled = false
    const loadModerators = async () => {
      setLoadingModerators(true)
      setModeratorIds([])
      try {
        const moderators = await forumService.getForumModerators(currentThread.forumId)
        if (!cancelled) {
          setModeratorIds(moderators.map((item) => item.userId))
        }
      } catch {
        if (!cancelled) {
          setModeratorIds([])
        }
      } finally {
        if (!cancelled) {
          setLoadingModerators(false)
        }
      }
    }

    void loadModerators()
    return () => {
      cancelled = true
    }
  }, [currentThread, currentUser, isAdmin, isAuthenticated])

  useEffect(() => {
    if (!canModerate) {
      return
    }

    let cancelled = false
    const loadForums = async () => {
      try {
        const forums = await forumService.getForums()
        if (!cancelled) {
          setForumOptions(forums)
        }
      } catch {
        if (!cancelled) {
          setForumOptions([])
        }
      }
    }

    void loadForums()
    return () => {
      cancelled = true
    }
  }, [canModerate])

  useEffect(() => {
    if (!canModerate || !currentForumId) {
      setModeratorLogs([])
      setLoadingModeratorLogs(false)
      return
    }

    let cancelled = false
    const loadLogs = async () => {
      setLoadingModeratorLogs(true)
      try {
        const logs = await forumService.getForumModeratorLogs(currentForumId, 1, 8)
        if (!cancelled) {
          setModeratorLogs(logs.items)
        }
      } catch {
        if (!cancelled) {
          setModeratorLogs([])
        }
      } finally {
        if (!cancelled) {
          setLoadingModeratorLogs(false)
        }
      }
    }

    void loadLogs()
    return () => {
      cancelled = true
    }
  }, [canModerate, currentForumId, currentThreadUpdatedAt])

  const moveTargets = useMemo(() => {
    if (!currentThread) {
      return forumOptions
    }
    return forumOptions.filter((forum) => forum.id !== currentThread.forumId)
  }, [currentThread, forumOptions])

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isAuthenticated) {
      toast.error('Please log in first')
      navigate('/login')
      return
    }

    try {
      await createPost({ threadId, content: replyContent })
      setReplyContent('')
      setPage(1)
      await fetchThreadById(threadId)
      await fetchThreadPosts(threadId, 1, 30)
      toast.success('Reply created')
    } catch {
      toast.error('Reply failed')
    }
  }

  async function handleModerationUpdate(
    patch: ModerateThreadInput,
    successMessage: string
  ) {
    if (!currentThread) {
      return
    }

    try {
      await moderateThread(threadId, patch)
      await fetchThreadById(threadId)
      toast.success(successMessage)
    } catch {
      toast.error('Moderation update failed')
    }
  }

  async function handleMoveThread() {
    if (!currentThread) {
      return
    }

    const parsedTargetId = Number(targetForumId)
    if (!Number.isInteger(parsedTargetId) || parsedTargetId < 1) {
      toast.error('Please select a target forum')
      return
    }
    if (parsedTargetId === currentThread.forumId) {
      toast.error('Please select a different target forum')
      return
    }

    try {
      await moveThread(threadId, parsedTargetId)
      await fetchThreadById(threadId)
      await fetchThreadPosts(threadId, 1, 30)
      setPage(1)
      setTargetForumId('')
      toast.success('Thread moved')
    } catch {
      toast.error('Move thread failed')
    }
  }

  if (!Number.isFinite(threadId) || threadId < 1) {
    return <div className="text-sm text-red-600">Invalid thread id</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-xs text-gray-500">
          <Link to="/forums" className="hover:text-gray-700">
            Forums
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
          <p className="mt-3 text-sm text-gray-500">Loading thread...</p>
        ) : currentThread ? (
          <>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">{currentThread.title}</h1>
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span>Author: {currentThread.author.username}</span>
              <span>Views: {currentThread.viewCount}</span>
              <span>Replies: {currentThread.replyCount}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {currentThread.isPinned && (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-700">
                  Pinned
                </span>
              )}
              {currentThread.isLocked && (
                <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-700">
                  Locked
                </span>
              )}
              {currentThread.isEssence && (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  Essence
                </span>
              )}
            </div>
            <article className="mt-5 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
              {currentThread.content}
            </article>

            {isAuthenticated && (isAdmin || loadingModerators || canModerate) && (
              <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900">Moderation Tools</h2>
                  {loadingModerators && !isAdmin && (
                    <span className="text-xs text-gray-500">Checking permissions...</span>
                  )}
                </div>

                {canModerate ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={moderating || moving}
                        onClick={() => {
                          void handleModerationUpdate(
                            { isPinned: !currentThread.isPinned },
                            currentThread.isPinned ? 'Thread unpinned' : 'Thread pinned'
                          )
                        }}
                      >
                        {currentThread.isPinned ? 'Unpin' : 'Set Pinned'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={moderating || moving}
                        onClick={() => {
                          void handleModerationUpdate(
                            { isLocked: !currentThread.isLocked },
                            currentThread.isLocked ? 'Thread unlocked' : 'Thread locked'
                          )
                        }}
                      >
                        {currentThread.isLocked ? 'Unlock Thread' : 'Lock Thread'}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                        disabled={moderating || moving}
                        onClick={() => {
                          void handleModerationUpdate(
                            { isEssence: !currentThread.isEssence },
                            currentThread.isEssence
                              ? 'Essence mark removed'
                              : 'Thread marked as essence'
                          )
                        }}
                      >
                        {currentThread.isEssence ? 'Unmark Essence' : 'Mark Essence'}
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                      <label className="space-y-1 text-xs text-gray-700" htmlFor="target-forum">
                        <span>Target Forum</span>
                        <select
                          id="target-forum"
                          value={targetForumId}
                          onChange={(event) => {
                            const value = event.target.value
                            setTargetForumId(value ? Number(value) : '')
                          }}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          disabled={moderating || moving}
                        >
                          <option value="">Select forum...</option>
                          {moveTargets.map((forum) => (
                            <option key={forum.id} value={forum.id}>
                              {forum.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="self-end rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={moderating || moving || targetForumId === ''}
                        onClick={() => {
                          void handleMoveThread()
                        }}
                      >
                        {moving ? 'Moving...' : 'Move Thread'}
                      </button>
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                      <h3 className="text-xs font-semibold text-gray-900">
                        Recent Moderator Logs
                      </h3>
                      {loadingModeratorLogs ? (
                        <p className="mt-2 text-xs text-gray-500">Loading logs...</p>
                      ) : moderatorLogs.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {moderatorLogs.map((log) => (
                            <li key={log.id} className="rounded border border-gray-200 px-2 py-1.5">
                              <p className="text-xs font-medium text-gray-800">{log.action}</p>
                              <p className="text-xs text-gray-500">
                                by {log.moderator.username}
                                {log.threadId ? ` · Thread #${log.threadId}` : ''}
                              </p>
                              {log.detail && (
                                <p className="text-xs text-gray-600">{log.detail}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-gray-500">No moderator logs yet.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    You do not have moderation permission in this forum.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-red-600">Thread not found</p>
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
          Replies {postPage ? `(${postPage.total})` : ''}
        </h2>
        {loadingPosts && !postPage ? (
          <p className="text-sm text-gray-500">Loading replies...</p>
        ) : (
          <PostList posts={postPage?.items ?? []} />
        )}
      </section>

      <Pagination page={page} totalPages={postPage?.totalPages ?? 1} onPageChange={setPage} />
    </div>
  )
}
