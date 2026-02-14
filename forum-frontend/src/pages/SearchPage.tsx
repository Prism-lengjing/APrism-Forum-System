import { type FormEvent, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Pagination from '../components/common/Pagination'
import { forumService } from '../services/forumService'
import { searchService } from '../services/searchService'
import type { ForumItem } from '../types/forum'
import type { SearchThreadPage, SearchUserPage } from '../types/search'

type SearchTab = 'threads' | 'users'

export default function SearchPage() {
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tab, setTab] = useState<SearchTab>('threads')
  const [forumFilter, setForumFilter] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [forums, setForums] = useState<ForumItem[]>([])
  const [threadPage, setThreadPage] = useState<SearchThreadPage | null>(null)
  const [userPage, setUserPage] = useState<SearchUserPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadForums = async () => {
      try {
        const data = await forumService.getForums()
        if (!cancelled) {
          setForums(data)
        }
      } catch {
        if (!cancelled) {
          setForums([])
        }
      }
    }

    void loadForums()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!keyword) {
      return
    }

    let cancelled = false
    const runSearch = async () => {
      setLoading(true)
      setError(null)
      try {
        if (tab === 'threads') {
          const result = await searchService.searchThreads(
            keyword,
            page,
            20,
            forumFilter ?? undefined
          )
          if (!cancelled) {
            setThreadPage(result)
          }
        } else {
          const result = await searchService.searchUsers(keyword, page, 20)
          if (!cancelled) {
            setUserPage(result)
          }
        }
      } catch {
        if (!cancelled) {
          setError('Search failed, please try again later.')
          if (tab === 'threads') {
            setThreadPage(null)
          } else {
            setUserPage(null)
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void runSearch()
    return () => {
      cancelled = true
    }
  }, [forumFilter, keyword, page, tab])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = keywordInput.trim()
    if (!trimmed) {
      setKeyword('')
      setThreadPage(null)
      setUserPage(null)
      return
    }
    setPage(1)
    setKeyword(trimmed)
  }

  function handleSwitchTab(nextTab: SearchTab) {
    if (nextTab === tab) {
      return
    }
    setTab(nextTab)
    setPage(1)
  }

  const currentTotalPages =
    tab === 'threads' ? threadPage?.totalPages ?? 1 : userPage?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Search</h1>
        <p className="mt-2 text-sm text-gray-600">
          Search threads and users by keyword.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Search keyword..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />
          {tab === 'threads' && (
            <select
              value={forumFilter ?? ''}
              onChange={(event) => {
                const value = event.target.value
                setForumFilter(value ? Number(value) : null)
                setPage(1)
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">All forums</option>
              {forums.map((forum) => (
                <option key={forum.id} value={forum.id}>
                  {forum.name}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Search
          </button>
        </form>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSwitchTab('threads')}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              tab === 'threads'
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Threads
          </button>
          <button
            type="button"
            onClick={() => handleSwitchTab('users')}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              tab === 'users'
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Users
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </section>

      {!keyword ? (
        <section className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Enter a keyword to start searching.
        </section>
      ) : tab === 'threads' ? (
        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Thread Results {threadPage ? `(${threadPage.total})` : ''}
          </h2>
          {loading && !threadPage ? (
            <p className="text-sm text-gray-500">Searching...</p>
          ) : threadPage && threadPage.items.length > 0 ? (
            <>
              <div className="space-y-2">
                {threadPage.items.map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/threads/${thread.id}`}
                    className="block rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{thread.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">{thread.excerpt}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      by {thread.author.username} · replies {thread.replyCount}
                    </p>
                  </Link>
                ))}
              </div>
              <Pagination page={page} totalPages={currentTotalPages} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No matching threads.</p>
          )}
        </section>
      ) : (
        <section className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            User Results {userPage ? `(${userPage.total})` : ''}
          </h2>
          {loading && !userPage ? (
            <p className="text-sm text-gray-500">Searching...</p>
          ) : userPage && userPage.items.length > 0 ? (
            <>
              <div className="space-y-2">
                {userPage.items.map((user) => (
                  <Link
                    key={user.id}
                    to={`/users/${user.id}`}
                    className="block rounded-xl border border-gray-200 px-4 py-3 hover:bg-gray-50"
                  >
                    <p className="text-sm font-semibold text-gray-900">{user.username}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-gray-600">
                      {user.bio || 'No profile bio.'}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      Lv.{user.level} · EXP {user.experience}
                    </p>
                  </Link>
                ))}
              </div>
              <Pagination page={page} totalPages={currentTotalPages} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-gray-500">No matching users.</p>
          )}
        </section>
      )}
    </div>
  )
}
