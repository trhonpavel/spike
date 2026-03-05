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
    <div className="glass-card-strong rounded-2xl overflow-hidden border-l-2 border-l-brand/30">
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 flex items-center justify-center rounded-lg bg-brand/10 text-brand text-xs font-bold font-mono">
              {group.group_index + 1}
            </span>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Group
            </h4>
          </div>
          <span className="text-[10px] text-zinc-600 font-mono truncate ml-3 max-w-[50%] text-right">
            {group.players.map((p) => p.name).join(' / ')}
          </span>
        </div>
      </div>

      <div className="divide-y divide-border/50">
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
