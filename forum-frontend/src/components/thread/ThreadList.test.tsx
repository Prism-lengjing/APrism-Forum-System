import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ThreadList from './ThreadList'

const thread = {
  id: 101,
  forumId: 1,
  title: 'JEST_Thread_Title',
  excerpt: 'JEST_Thread_Excerpt',
  type: 'normal',
  isPinned: true,
  isLocked: false,
  isEssence: false,
  viewCount: 12,
  replyCount: 3,
  likeCount: 1,
  lastPostTime: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: {
    id: 2,
    username: 'jest_author',
    avatar: null,
  },
}

describe('ThreadList', () => {
  it('renders empty state when no threads', () => {
    render(
      <MemoryRouter>
        <ThreadList threads={[]} />
      </MemoryRouter>
    )

    expect(screen.getByText('暂无主题，欢迎发布第一帖。')).toBeInTheDocument()
  })

  it('renders thread items', () => {
    render(
      <MemoryRouter>
        <ThreadList threads={[thread]} />
      </MemoryRouter>
    )

    expect(screen.getByText('置顶')).toBeInTheDocument()
    expect(screen.getByText('JEST_Thread_Title')).toBeInTheDocument()
    expect(screen.getByText('JEST_Thread_Excerpt')).toBeInTheDocument()
    expect(screen.getByText('jest_author')).toBeInTheDocument()
  })
})
