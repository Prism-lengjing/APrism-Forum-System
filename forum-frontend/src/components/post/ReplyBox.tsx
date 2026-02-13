import type { FormEvent } from 'react'

interface ReplyBoxProps {
  content: string
  onContentChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
  disabled?: boolean
}

export default function ReplyBox({
  content,
  onContentChange,
  onSubmit,
  submitting,
  disabled = false,
}: ReplyBoxProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-900">回复主题</h2>
      <textarea
        className="h-28 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        placeholder="写下你的回复..."
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        minLength={1}
        maxLength={10000}
        required
        disabled={disabled || submitting}
      />
      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-gray-500">{disabled ? '登录后可回复' : '支持纯文本回复'}</p>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={disabled || submitting}
        >
          {submitting ? '提交中...' : '提交回复'}
        </button>
      </div>
    </form>
  )
}
