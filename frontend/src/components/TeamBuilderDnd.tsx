import { useDraggable, useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { type LeaguePlayer } from '../api/league-client'
import type { PositionId } from '../pages/TeamBuilderPage'

// ── Draggable player card ─────────────────────────────────────────
export function DraggablePlayer({
  player,
  isSelected,
  onTap,
}: {
  player: LeaguePlayer
  isSelected: boolean
  onTap: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => { e.stopPropagation(); onTap() }}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
        isSelected
          ? 'bg-brand/15 border-brand/50 text-brand'
          : 'bg-surface-3 border-border hover:border-border-bright'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={`font-medium text-sm truncate ${isSelected ? 'text-brand' : 'text-white'}`}>{player.name}</p>
          {player.locked && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          )}
          {player.tentative && !player.locked && (
            <span className="font-display text-[10px] font-bold text-orange-400 border border-orange-500/30 px-1 rounded leading-4">?</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <p className="font-display text-[10px] text-zinc-500 tabular-nums">{player.elo_rating.toFixed(0)} Elo</p>
          {player.note && (
            <p className="text-[10px] text-zinc-500 italic truncate max-w-[80px]">{player.note}</p>
          )}
        </div>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
      </svg>
    </div>
  )
}

// ── Droppable slot ────────────────────────────────────────────────
export function DroppableSlot({
  id,
  player,
  isSelected,
  onTap,
  selectedPlayerId,
  locked = false,
  onLock,
  onTentative,
  onNote,
  noteEditing = false,
  noteValue = '',
  onNoteChange,
  onNoteCommit,
}: {
  id: PositionId
  player: LeaguePlayer | undefined
  isSelected: boolean
  onTap: () => void
  selectedPlayerId: number | undefined
  locked?: boolean
  onLock?: (e: React.MouseEvent) => void
  onTentative?: (e: React.MouseEvent) => void
  onNote?: (e: React.MouseEvent) => void
  noteEditing?: boolean
  noteValue?: string
  onNoteChange?: (val: string) => void
  onNoteCommit?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const isOccupied = !!player
  const isOwnSelected = player && selectedPlayerId === player.id

  return (
    <div
      ref={setNodeRef}
      onClick={onTap}
      className={`relative rounded-xl border transition-all cursor-pointer min-h-[56px] ${
        isOver
          ? 'border-brand bg-brand/10'
          : locked
          ? 'border-green-500/50 bg-surface-3'
          : isSelected && !isOccupied
          ? 'border-brand/50 bg-brand/5'
          : isOccupied
          ? 'border-border bg-surface-3'
          : 'border-dashed border-border-bright bg-surface-3/50 hover:border-border-bright'
      }`}
    >
      {isOccupied ? (
        <div className={isOwnSelected ? 'opacity-50' : ''}>
          <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-white text-sm truncate">{player!.name}</p>
                {player!.locked && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
                {player!.tentative && !player!.locked && (
                  <span className="font-display text-[10px] font-bold text-orange-400 border border-orange-500/30 px-1 rounded leading-4">?</span>
                )}
              </div>
              <p className="font-display text-[10px] text-zinc-500 tabular-nums">{player!.elo_rating.toFixed(0)} Elo</p>
            </div>
            {(onLock || onTentative || onNote) && (
              <div className="flex items-center gap-0.5 shrink-0">
                {onLock && (
                  <button
                    onClick={onLock}
                    className={`p-1 rounded transition-colors cursor-pointer ${player!.locked ? 'text-green-500' : 'text-zinc-600 hover:text-green-500'}`}
                    title={player!.locked ? 'Unlock' : 'Lock'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                {onTentative && (
                  <button
                    onClick={onTentative}
                    className={`p-1 rounded transition-colors cursor-pointer font-bold text-sm leading-none ${player!.tentative ? 'text-orange-400' : 'text-zinc-600 hover:text-orange-400'}`}
                    title={player!.tentative ? 'Remove tentative' : 'Mark tentative'}
                  >?</button>
                )}
                {onNote && (
                  <button
                    onClick={onNote}
                    className={`p-1 rounded transition-colors cursor-pointer ${player!.note ? 'text-blue-400' : 'text-zinc-600 hover:text-blue-400'}`}
                    title="Note"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
          {noteEditing && onNoteChange && onNoteCommit && (
            <div className="px-2 pb-2" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={noteValue}
                onChange={e => onNoteChange(e.target.value)}
                placeholder="Add note..."
                maxLength={300}
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') onNoteCommit()
                  if (e.key === 'Escape') onNoteCommit()
                }}
                className="w-full px-2 py-1.5 bg-surface-4 border border-blue-400/40 rounded-lg text-white placeholder-zinc-600 focus:outline-none text-xs"
              />
            </div>
          )}
          {player!.note && !noteEditing && (
            <div className="px-3 pb-2">
              <p className="text-[10px] text-zinc-500 italic truncate">{player!.note}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-14">
          <span className="font-display text-[10px] uppercase tracking-widest text-zinc-600">
            {isSelected ? '+ Drop here' : 'Empty'}
          </span>
        </div>
      )}
    </div>
  )
}
