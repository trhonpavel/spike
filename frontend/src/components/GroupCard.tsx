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
    <div className="bg-surface-2 rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Group {group.group_index + 1}
          </h4>
          <span className="text-[10px] text-zinc-600 font-mono">
            {group.players.map((p) => p.name).join(' / ')}
          </span>
        </div>
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
