interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (nextPage: number) => void
  disabled?: boolean
}

export default function Pagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const safeTotalPages = Math.max(1, totalPages)
  const canPrev = !disabled && page > 1
  const canNext = !disabled && page < safeTotalPages

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={!canPrev}
      >
        上一页
      </button>
      <span className="text-sm text-gray-600">
        第 {page} / {safeTotalPages} 页
      </span>
      <button
        type="button"
        className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
        disabled={!canNext}
      >
        下一页
      </button>
    </div>
  )
}
