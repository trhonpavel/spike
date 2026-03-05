import type { GroupData } from '../api/client'
import MatchScoreInput from './MatchScoreInput'

interface Props {
  group: GroupData
  slug: string
  admin: boolean
  token: string | null
}

export default function GroupCard({ group, slug, admin, token }: Props) {
  return (
    <div className="bg-surface-2 rounded-2xl border border-border overflow-hidden">
      {/* Header — angled accent */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-brand/8 to-transparent border-b border-border">
        <span className="score-num text-xl text-brand">
          {group.group_index + 1}
        </span>
        <div className="h-4 w-px bg-border" />
        <span className="text-xs text-zinc-500 truncate font-medium">
          {group.players.map((p) => p.name).join(' · ')}
        </span>
      </div>

      <div className="divide-y divide-border">
        {group.matches.map((match) => (
          <MatchScoreInput
            key={match.id}
            match={match}
            slug={slug}
            admin={admin}
            token={token}
          />
        ))}
      </div>
    </div>
  )
}
