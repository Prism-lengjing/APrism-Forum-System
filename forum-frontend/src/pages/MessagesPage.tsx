import { type FormEvent, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import { useAuthStore } from '../store/authStore'
import { useMessageStore } from '../store/messageStore'
import type { ConversationItem } from '../types/message'

export default function MessagesPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const currentUser = useAuthStore((state) => state.user)

  const conversationPage = useMessageStore((state) => state.conversationPage)
  const messagePage = useMessageStore((state) => state.messagePage)
  const currentConversationId = useMessageStore((state) => state.currentConversationId)
  const loadingConversations = useMessageStore((state) => state.loadingConversations)
  const loadingMessages = useMessageStore((state) => state.loadingMessages)
  const sending = useMessageStore((state) => state.sending)
  const deletingIds = useMessageStore((state) => state.deletingIds)
  const error = useMessageStore((state) => state.error)
  const fetchConversations = useMessageStore((state) => state.fetchConversations)
  const fetchMessages = useMessageStore((state) => state.fetchMessages)
  const setCurrentConversation = useMessageStore((state) => state.setCurrentConversation)
  const sendMessage = useMessageStore((state) => state.sendMessage)
  const deleteMessage = useMessageStore((state) => state.deleteMessage)
  const reset = useMessageStore((state) => state.reset)

  const [conversationPageNo, setConversationPageNo] = useState(1)
  const [messagePageNo, setMessagePageNo] = useState(1)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (!isAuthenticated) {
      reset()
      return
    }
    void fetchConversations(conversationPageNo, 20).catch(() => {
      // Error state is captured in store.
    })
  }, [conversationPageNo, fetchConversations, isAuthenticated, reset])

  useEffect(() => {
    if (!isAuthenticated || !currentConversationId) {
      return
    }
    void fetchMessages(currentConversationId, messagePageNo, 50).catch(() => {
      // Error state is captured in store.
    })
  }, [currentConversationId, fetchMessages, isAuthenticated, messagePageNo])

  const currentConversation = useMemo<ConversationItem | null>(() => {
    if (!conversationPage || !currentConversationId) {
      return null
    }
    return (
      conversationPage.items.find((item) => item.id === currentConversationId) ?? null
    )
  }, [conversationPage, currentConversationId])

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !currentConversation) {
      return
    }

    try {
      await sendMessage(currentConversation.peerUser.id, content)
      setDraft('')
    } catch {
      toast.error('Failed to send message')
    }
  }

  async function handleDelete(messageId: number) {
    try {
      await deleteMessage(messageId)
    } catch {
      toast.error('Failed to delete message')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-700">
          Please
          {' '}
          <Link to="/login" className="text-blue-600 hover:text-blue-500">
            log in
          </Link>
          {' '}
          to use private messages.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Private Messages</h1>
        <p className="mt-2 text-sm text-gray-600">
          Select a conversation to view and reply.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
            {loadingConversations && (
              <span className="text-xs text-gray-500">Loading...</span>
            )}
          </div>
          <div className="space-y-2">
            {conversationPage?.items.length ? (
              conversationPage.items.map((item) => {
                const active = item.id === currentConversationId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMessagePageNo(1)
                      setCurrentConversation(item.id)
                    }}
                    className={`w-full rounded-xl border px-3 py-2 text-left ${
                      active
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {item.peerUser.username}
                      </p>
                      {item.unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white">
                          {item.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                      {item.lastMessage?.content || 'No messages yet'}
                    </p>
                  </button>
                )
              })
            ) : (
              <p className="text-sm text-gray-500">No conversations.</p>
            )}
          </div>
          {conversationPage && conversationPage.totalPages > 1 && (
            <div className="mt-3">
              <Pagination
                page={conversationPageNo}
                totalPages={conversationPage.totalPages}
                onPageChange={setConversationPageNo}
                disabled={loadingConversations}
              />
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {currentConversation ? (
            <>
              <div className="mb-3 border-b border-gray-100 pb-3">
                <p className="text-sm text-gray-500">Chatting with</p>
                <p className="text-base font-semibold text-gray-900">
                  {currentConversation.peerUser.username}
                </p>
              </div>

              <div className="space-y-2">
                {loadingMessages && !messagePage ? (
                  <p className="text-sm text-gray-500">Loading messages...</p>
                ) : messagePage && messagePage.items.length > 0 ? (
                  messagePage.items.map((item) => {
                    const isMine = item.senderId === currentUser?.id
                    return (
                      <div
                        key={item.id}
                        className={`rounded-xl border px-3 py-2 ${
                          isMine
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-gray-700">
                            {isMine ? 'You' : item.sender.username}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-gray-500">{item.createdAt}</span>
                            <button
                              type="button"
                              className="text-[11px] text-red-600 hover:text-red-500 disabled:opacity-50"
                              onClick={() => {
                                void handleDelete(item.id)
                              }}
                              disabled={deletingIds.includes(item.id)}
                            >
                              {deletingIds.includes(item.id) ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-gray-900">
                          {item.content}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-sm text-gray-500">No messages yet.</p>
                )}
              </div>

              {messagePage && messagePage.totalPages > 1 && (
                <div className="mt-3">
                  <Pagination
                    page={messagePageNo}
                    totalPages={messagePage.totalPages}
                    onPageChange={setMessagePageNo}
                    disabled={loadingMessages}
                  />
                </div>
              )}

              <form onSubmit={handleSend} className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={3}
                  placeholder="Type your message..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                  disabled={sending}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={sending || draft.trim().length === 0}
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Select a conversation from the left list.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
