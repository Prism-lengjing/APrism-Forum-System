import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('disables previous button on first page and triggers next page change', () => {
    const onPageChange = vi.fn()

    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />)

    const prevButton = screen.getByRole('button', { name: '上一页' })
    const nextButton = screen.getByRole('button', { name: '下一页' })

    expect(prevButton).toBeDisabled()
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables next button on last page', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => undefined} />)
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
  })
})
