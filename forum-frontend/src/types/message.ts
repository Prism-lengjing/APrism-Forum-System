import type { PaginatedResult } from './api'

export interface MessagePeerUser {
  id: number
  username: string
  avatar: string | null
}

export interface ConversationItem {
  id: number
  peerUser: MessagePeerUser
  lastMessage: {
    id: number
    content: string
    createdAt: string
  } | null
  unreadCount: number
}

export type ConversationPage = PaginatedResult<ConversationItem>

export interface MessageItem {
  id: number
  conversationId: number
  senderId: number
  receiverId: number
  content: string
  isRead: boolean
  readAt: string | null
  createdAt: string
  sender: MessagePeerUser
  receiver: MessagePeerUser
}

export type MessagePage = PaginatedResult<MessageItem>

export interface SendMessageInput {
  receiverId: number
  content: string
}
