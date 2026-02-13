import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PostList from './PostList'

const post = {
  id: 201,
  threadId: 101,
  userId: 2,
  content: 'JEST_Post_Content',
  floor: 1,
  parentId: null,
  isThreadAuthor: false,
  likeCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  author: {
    id: 2,
    username: 'jest_replier',
    avatar: null,
    level: 5,
    postCount: 12,
  },
}

describe('PostList', () => {
  it('renders empty state when no posts', () => {
    render(<PostList posts={[]} />)
    expect(screen.getByText('还没有回复，来抢沙发吧。')).toBeInTheDocument()
  })

  it('renders post items', () => {
    render(<PostList posts={[post]} />)

    expect(screen.getByText('jest_replier')).toBeInTheDocument()
    expect(screen.getByText('Lv.5')).toBeInTheDocument()
    expect(screen.getByText('1 楼')).toBeInTheDocument()
    expect(screen.getByText('JEST_Post_Content')).toBeInTheDocument()
  })
})
