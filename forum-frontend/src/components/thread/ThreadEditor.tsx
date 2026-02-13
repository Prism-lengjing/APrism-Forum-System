import type { FormEvent } from 'react'

interface ThreadEditorProps {
  title: string
  content: string
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
  disabled?: boolean
}

export default function ThreadEditor({
  title,
  content,
  onTitleChange,
  onContentChange,
  onSubmit,
  submitting,
  disabled = false,
}: ThreadEditorProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-900">发布新主题</h2>
      <div className="space-y-3">
        <input
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="标题（3-255字）"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          minLength={3}
          maxLength={255}
          required
          disabled={disabled || submitting}
        />
        <textarea
          className="h-32 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          placeholder="内容"
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          minLength={1}
          maxLength={20000}
          required
          disabled={disabled || submitting}
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {disabled ? '登录后可发帖' : '发布后将自动跳转主题页'}
          </p>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={disabled || submitting}
          >
            {submitting ? '发布中...' : '发布主题'}
          </button>
        </div>
      </div>
    </form>
  )
}
