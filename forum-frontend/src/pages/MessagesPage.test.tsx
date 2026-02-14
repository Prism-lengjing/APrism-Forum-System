import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MessagesPage from './MessagesPage'

const mocks = vi.hoisted(() => ({
  fetchConversations: vi.fn().mockResolvedValue(undefined),
  fetchMessages: vi.fn().mockResolvedValue(undefined),
  setCurrentConversation: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
  deleteMessage: vi.fn().mockResolvedValue(undefined),
  reset: vi.fn(),
  authState: {
    isAuthenticated: true,
    user: {
      id: 100,
      username: 'jest_current_user',
      email: 'jest_current_user@example.com',
      avatar: null,
      bio: null,
      role: 'user',
      level: 1,
      experience: 0,
      postCount: 0,
      threadCount: 0,
      createdAt: '2026-02-14T00:00:00.000Z',
    },
  },
  conversationPage: {
    items: [
      {
        id: 1,
        peerUser: {
          id: 200,
          username: 'jest_peer_user',
          avatar: null,
        },
        lastMessage: {
          id: 10,
          content: 'JEST last message',
          createdAt: '2026-02-14T00:00:00.000Z',
        },
        unreadCount: 2,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
    totalPages: 1,
  },
  messagePage: {
    items: [
      {
        id: 10,
        conversationId: 1,
        senderId: 200,
        receiverId: 100,
        content: 'JEST peer message',
        isRead: true,
        readAt: '2026-02-14T00:00:00.000Z',
        createdAt: '2026-02-14T00:00:00.000Z',
        sender: {
          id: 200,
          username: 'jest_peer_user',
          avatar: null,
        },
        receiver: {
          id: 100,
          username: 'jest_current_user',
          avatar: null,
        },
      },
    ],
    page: 1,
    pageSize: 50,
    total: 1,
    totalPages: 1,
  },
  currentConversationId: 1,
}))

vi.mock('../store/authStore', () => ({
  useAuthStore: (
    selector: (state: { isAuthenticated: boolean; user: unknown }) => unknown
  ) => selector(mocks.authState),
}))

vi.mock('../store/messageStore', () => ({
  useMessageStore: (selector: (state: unknown) => unknown) =>
    selector({
      conversationPage: mocks.conversationPage,
      messagePage: mocks.messagePage,
      currentConversationId: mocks.currentConversationId,
      loadingConversations: false,
      loadingMessages: false,
      sending: false,
      deletingIds: [],
      error: null,
      fetchConversations: mocks.fetchConversations,
      fetchMessages: mocks.fetchMessages,
      setCurrentConversation: mocks.setCurrentConversation,
      sendMessage: mocks.sendMessage,
      deleteMessage: mocks.deleteMessage,
      reset: mocks.reset,
    }),
}))

describe('MessagesPage', () => {
  beforeEach(() => {
    mocks.fetchConversations.mockClear()
    mocks.fetchMessages.mockClear()
    mocks.setCurrentConversation.mockClear()
    mocks.sendMessage.mockClear()
    mocks.deleteMessage.mockClear()
    mocks.reset.mockClear()
    mocks.authState.isAuthenticated = true
    mocks.currentConversationId = 1
  })

  it('shows login prompt for unauthenticated user', () => {
    mocks.authState.isAuthenticated = false

    render(
      <MemoryRouter>
        <MessagesPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/to use private messages/i)).toBeInTheDocument()
    expect(mocks.reset).toHaveBeenCalledTimes(1)
  })

  it('loads conversation/messages and supports send/delete actions', async () => {
    render(
      <MemoryRouter>
        <MessagesPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: 'Private Messages' })).toBeInTheDocument()
    expect(screen.getAllByText('jest_peer_user').length).toBeGreaterThan(0)
    expect(screen.getByText('JEST peer message')).toBeInTheDocument()

    await waitFor(() => {
      expect(mocks.fetchConversations).toHaveBeenCalledWith(1, 20)
      expect(mocks.fetchMessages).toHaveBeenCalledWith(1, 1, 50)
    })

    fireEvent.change(screen.getByPlaceholderText('Type your message...'), {
      target: { value: 'JEST new message' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(mocks.sendMessage).toHaveBeenCalledWith(200, 'JEST new message')
    })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(mocks.deleteMessage).toHaveBeenCalledWith(10)
    })
  })
})
