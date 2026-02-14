import { messageService } from './messageService'
import type { ConversationPage, MessageItem, MessagePage } from '../types/message'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('./api', () => ({
  apiClient: {
    get: mocks.get,
    post: mocks.post,
    delete: mocks.delete,
  },
  unwrapResponse: <T>(response: { data: { data: T } }): T => response.data.data,
}))

describe('messageService', () => {
  beforeEach(() => {
    mocks.get.mockReset()
    mocks.post.mockReset()
    mocks.delete.mockReset()
  })

  it('requests conversation list with pagination params', async () => {
    const mockPage: ConversationPage = {
      items: [],
      page: 2,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    }
    mocks.get.mockResolvedValue({ data: { data: mockPage } })

    const result = await messageService.getConversations(2, 10)

    expect(mocks.get).toHaveBeenCalledWith('/messages/conversations', {
      params: { page: 2, pageSize: 10 },
    })
    expect(result).toEqual(mockPage)
  })

  it('requests conversation messages with pagination params', async () => {
    const mockPage: MessagePage = {
      items: [],
      page: 1,
      pageSize: 50,
      total: 0,
      totalPages: 1,
    }
    mocks.get.mockResolvedValue({ data: { data: mockPage } })

    const result = await messageService.getConversationMessages(33, 1, 50)

    expect(mocks.get).toHaveBeenCalledWith('/messages/conversations/33', {
      params: { page: 1, pageSize: 50 },
    })
    expect(result).toEqual(mockPage)
  })

  it('sends and deletes message via api endpoints', async () => {
    const mockMessage: MessageItem = {
      id: 9,
      conversationId: 1,
      senderId: 1,
      receiverId: 2,
      content: 'hello',
      isRead: false,
      readAt: null,
      createdAt: '2026-02-14T00:00:00.000Z',
      sender: { id: 1, username: 'u1', avatar: null },
      receiver: { id: 2, username: 'u2', avatar: null },
    }
    mocks.post.mockResolvedValue({ data: { data: mockMessage } })
    mocks.delete.mockResolvedValue({ data: { data: { deleted: true } } })

    const sent = await messageService.sendMessage({ receiverId: 2, content: 'hello' })
    const deleted = await messageService.deleteMessage(9)

    expect(mocks.post).toHaveBeenCalledWith('/messages', {
      receiverId: 2,
      content: 'hello',
    })
    expect(mocks.delete).toHaveBeenCalledWith('/messages/9')
    expect(sent).toEqual(mockMessage)
    expect(deleted).toEqual({ deleted: true })
  })
})
