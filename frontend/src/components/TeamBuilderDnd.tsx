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
        <p className={`font-medium text-sm truncate ${isSelected ? 'text-brand' : 'text-white'}`}>{player.name}</p>
        <p className="font-display text-[10px] text-zinc-500 tabular-nums">{player.elo_rating.toFixed(0)} Elo</p>
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
}: {
  id: PositionId
  player: LeaguePlayer | undefined
  isSelected: boolean
  onTap: () => void
  selectedPlayerId: number | undefined
  locked?: boolean
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
        <div className={`flex items-center gap-2 px-3 py-2.5 ${isOwnSelected ? 'opacity-50' : ''}`}>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white text-sm truncate">{player!.name}</p>
            <p className="font-display text-[10px] text-zinc-500 tabular-nums">{player!.elo_rating.toFixed(0)} Elo</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-zinc-600 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
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
