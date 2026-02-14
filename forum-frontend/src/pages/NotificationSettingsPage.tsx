import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { notificationService } from '../services/notificationService'
import { useAuthStore } from '../store/authStore'
import type {
  NotificationSettings,
  UpdateNotificationSettingsInput,
} from '../types/notification'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, value) => value)

function formatHour(value: number): string {
  return `${value.toString().padStart(2, '0')}:00`
}

export default function NotificationSettingsPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  const [settings, setSettings] = useState<NotificationSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await notificationService.getSettings()
        if (!cancelled) {
          setSettings(data)
        }
      } catch {
        if (!cancelled) {
          setError('加载通知设置失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const dndText = useMemo(() => {
    if (!settings) {
      return ''
    }
    return `${formatHour(settings.dndStartHour)} - ${formatHour(settings.dndEndHour)}`
  }, [settings])

  async function applyPatch(patch: UpdateNotificationSettingsInput) {
    if (!settings || saving) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const next = await notificationService.updateSettings(patch)
      setSettings(next)
      setSavedAt(new Date().toISOString())
    } catch {
      setError('保存通知设置失败')
    } finally {
      setSaving(false)
    }
  }

  function renderToggle(
    label: string,
    checked: boolean,
    onChange: (value: boolean) => void
  ) {
    return (
      <label className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2">
        <span className="text-sm text-gray-800">{label}</span>
        <input
          type="checkbox"
          checked={checked}
          disabled={saving}
          onChange={(event) => {
            onChange(event.target.checked)
          }}
        />
      </label>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        请先登录后配置通知设置。<Link to="/login" className="ml-1 text-blue-600">去登录</Link>
      </div>
    )
  }

  if (loading && !settings) {
    return <div className="text-sm text-gray-500">加载通知设置中...</div>
  }

  if (!settings) {
    return <div className="text-sm text-red-600">{error || '通知设置不可用'}</div>
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">通知设置</h1>
        <p className="mt-2 text-sm text-gray-600">
          你可以配置通知类型开关，以及免打扰时间段。
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {savedAt && !error && (
          <p className="mt-3 text-xs text-green-600">
            已保存：{savedAt.slice(0, 19).replace('T', ' ')}
          </p>
        )}
      </section>

      <section className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm">
        {renderToggle('主题回复通知', settings.threadReplyEnabled, (value) => {
          void applyPatch({ threadReplyEnabled: value })
        })}
        {renderToggle('楼层回复通知', settings.postReplyEnabled, (value) => {
          void applyPatch({ postReplyEnabled: value })
        })}
        {renderToggle('@提及通知', settings.mentionEnabled, (value) => {
          void applyPatch({ mentionEnabled: value })
        })}
        {renderToggle('帖子点赞通知', settings.postLikedEnabled, (value) => {
          void applyPatch({ postLikedEnabled: value })
        })}
        {renderToggle('关注通知', settings.followEnabled, (value) => {
          void applyPatch({ followEnabled: value })
        })}
        {renderToggle('系统通知', settings.systemEnabled, (value) => {
          void applyPatch({ systemEnabled: value })
        })}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="space-y-3">
          {renderToggle('开启免打扰', settings.dndEnabled, (value) => {
            void applyPatch({ dndEnabled: value })
          })}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-700">
              <span>开始时间</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={settings.dndStartHour}
                disabled={saving}
                onChange={(event) => {
                  void applyPatch({ dndStartHour: Number(event.target.value) })
                }}
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm text-gray-700">
              <span>结束时间</span>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                value={settings.dndEndHour}
                disabled={saving}
                onChange={(event) => {
                  void applyPatch({ dndEndHour: Number(event.target.value) })
                }}
              >
                {HOUR_OPTIONS.map((hour) => (
                  <option key={hour} value={hour}>
                    {formatHour(hour)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500">当前免打扰时间段：{dndText}</p>
        </div>
      </section>
    </div>
  )
}
