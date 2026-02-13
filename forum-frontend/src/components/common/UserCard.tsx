interface UserCardProps {
  username: string
  avatar?: string | null
  secondary?: string
}

export default function UserCard({ username, avatar, secondary }: UserCardProps) {
  const initials = username.slice(0, 1).toUpperCase()

  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        <img
          src={avatar}
          alt={`${username} avatar`}
          className="h-8 w-8 rounded-full border border-gray-200 object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
          {initials}
        </div>
      )}

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-gray-900">{username}</div>
        {secondary && <div className="truncate text-xs text-gray-500">{secondary}</div>}
      </div>
    </div>
  )
}
