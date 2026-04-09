import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { leagueApi, getLeagueToken, type LeaguePlayer } from '../api/league-client'
import { getSessionToken } from '../api/client'
import { toast } from '../hooks/useToast'
import { DraggablePlayer, DroppableSlot } from '../components/TeamBuilderDnd'

// slot 0-4 = Seeds 1-5 (2 players each)
// slot 5-6 = Alternates (1 player each)
const SLOT_LABELS = ['Seed 1', 'Seed 2', 'Seed 3', 'Seed 4', 'Seed 5', 'Alternate 1', 'Alternate 2']
const IS_ALTERNATE = (i: number) => i >= 5

export type PositionId = `s${number}p${'1' | '2'}` | 'pool'

export interface Assignment {
  [posId: string]: LeaguePlayer | undefined
}

function buildAssignment(
  slots: { slot_index: number; player1: LeaguePlayer | null; player2: LeaguePlayer | null }[]
): Assignment {
  const a: Assignment = {}
  for (const s of slots) {
    if (s.player1) a[`s${s.slot_index}p1`] = s.player1
    if (s.player2) a[`s${s.slot_index}p2`] = s.player2
  }
  return a
}

function compositionToSlots(assignment: Assignment) {
  return Array.from({ length: 7 }, (_, i) => ({
    slot_index: i,
    player1_id: assignment[`s${i}p1`]?.id ?? null,
    player2_id: IS_ALTERNATE(i) ? null : (assignment[`s${i}p2`]?.id ?? null),
  }))
}

export default function TeamBuilderPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const appAuth = !!getSessionToken()
  const storedToken = slug ? getLeagueToken(slug) : null
  const token = storedToken || ''
  const isAdmin = appAuth || !!storedToken

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [draggedPlayer, setDraggedPlayer] = useState<LeaguePlayer | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<LeaguePlayer | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['league-teams', slug],
    queryFn: () => leagueApi.getTeams(slug!),
    enabled: !!slug,
    select: (d) => d,
  })

  // Initialize assignment from server data (once)
  const initAssignment = useCallback((serverData: typeof data) => {
    if (!serverData || assignment !== null) return
    setAssignment(buildAssignment(serverData.slots))
  }, [assignment])

  if (data && assignment === null) {
    initAssignment(data)
  }

  const saveMutation = useMutation({
    mutationFn: (a: Assignment) => leagueApi.saveTeams(slug!, compositionToSlots(a), token),
    onSuccess: (updated) => {
      queryClient.setQueryData(['league-teams', slug], updated)
      setAssignment(buildAssignment(updated.slots))
      toast.success('Saved!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  // Find where a player currently sits
  function findPlayerPosition(playerId: number): PositionId | null {
    if (!assignment) return null
    for (const [pos, p] of Object.entries(assignment)) {
      if (p?.id === playerId) return pos as PositionId
    }
    return null
  }

  function getAllPlayers(): LeaguePlayer[] {
    if (!data) return []
    const all: LeaguePlayer[] = []
    for (const s of data.slots) {
      if (s.player1) all.push(s.player1)
      if (s.player2) all.push(s.player2)
    }
    all.push(...data.unassigned)
    return all
  }

  function getPoolPlayers(): LeaguePlayer[] {
    if (!assignment || !data) return data?.unassigned ?? []
    const assigned = new Set(Object.values(assignment).map(p => p?.id))
    return getAllPlayers().filter(p => !assigned.has(p.id))
  }

  function movePlayer(playerId: number, targetPos: PositionId) {
    setAssignment(prev => {
      if (!prev) return prev
      const next = { ...prev }
      const srcPos = findPlayerPosition(playerId)
      const player = getAllPlayers().find(p => p.id === playerId)!
      const occupant = targetPos !== 'pool' ? next[targetPos] : undefined

      // Remove from source
      if (srcPos && srcPos !== 'pool') {
        if (occupant) {
          next[srcPos] = occupant  // swap
        } else {
          delete next[srcPos]
        }
      }

      // Place at target
      if (targetPos !== 'pool') {
        next[targetPos] = player
      }

      return next
    })
  }

  function handleDragStart(e: DragStartEvent) {
    const player = getAllPlayers().find(p => p.id === Number(e.active.id))
    setDraggedPlayer(player ?? null)
    setSelectedPlayer(null)
  }

  function handleDragEnd(e: DragEndEvent) {
    setDraggedPlayer(null)
    if (!e.over) return
    const playerId = Number(e.active.id)
    const targetPos = e.over.id as PositionId
    movePlayer(playerId, targetPos)
  }

  // Tap-to-select for mobile
  function handlePlayerTap(player: LeaguePlayer) {
    if (selectedPlayer?.id === player.id) {
      setSelectedPlayer(null)
    } else {
      setSelectedPlayer(player)
    }
  }

  function handleSlotTap(posId: PositionId) {
    if (!selectedPlayer) return
    movePlayer(selectedPlayer.id, posId)
    setSelectedPlayer(null)
  }

  function handlePoolTap() {
    if (!selectedPlayer) return
    const srcPos = findPlayerPosition(selectedPlayer.id)
    if (srcPos && srcPos !== 'pool') {
      setAssignment(prev => {
        if (!prev) return prev
        const next = { ...prev }
        delete next[srcPos]
        return next
      })
    }
    setSelectedPlayer(null)
  }

  const poolPlayers = getPoolPlayers()

  if (isLoading || assignment === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Header */}
      <header className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/l/${slug}`} className="p-1.5 rounded-lg text-zinc-500 hover:text-brand transition-colors cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </Link>
            <div>
              <h1 className="font-display text-base font-bold text-white uppercase tracking-wide">Team Composition</h1>
              <p className="font-display text-[10px] text-zinc-500 uppercase tracking-widest">Worlds 2026</p>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => saveMutation.mutate(assignment)}
              disabled={saveMutation.isPending}
              className="btn-brand px-4 py-2 rounded-xl text-sm font-display font-bold uppercase tracking-wider disabled:opacity-30 cursor-pointer"
            >
              {saveMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full anim-spin" />
                  Saving
                </span>
              ) : 'Save'}
            </button>
          )}
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">

            {/* === LEFT: SLOTS === */}
            <div className="space-y-3">
              {/* Seeds */}
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Seeds</h2>
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="bg-surface-2 rounded-2xl border border-border p-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="score-num text-2xl text-brand">{i + 1}</span>
                    <span className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">{SLOT_LABELS[i]}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['p1', 'p2'] as const).map((p) => {
                      const posId = `s${i}${p}` as PositionId
                      const player = assignment[posId]
                      return (
                        <DroppableSlot
                          key={posId}
                          id={posId}
                          player={player}
                          isSelected={selectedPlayer !== null}
                          onTap={() => player ? handlePlayerTap(player) : handleSlotTap(posId)}
                          selectedPlayerId={selectedPlayer?.id}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}

              {/* Alternates */}
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500 pt-1">Alternates</h2>
              <div className="bg-surface-2 rounded-2xl border border-border p-3 space-y-2">
                {[5, 6].map((i) => {
                  const posId = `s${i}p1` as PositionId
                  const player = assignment[posId]
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="font-display text-[10px] font-bold uppercase tracking-widest text-zinc-500 w-16 shrink-0">{SLOT_LABELS[i]}</span>
                      <div className="flex-1">
                        <DroppableSlot
                          id={posId}
                          player={player}
                          isSelected={selectedPlayer !== null}
                          onTap={() => player ? handlePlayerTap(player) : handleSlotTap(posId)}
                          selectedPlayerId={selectedPlayer?.id}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* === RIGHT: POOL === */}
            <div>
              <div className="lg:sticky lg:top-20">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">
                    Available
                  </h2>
                  <span className={`font-display text-xs font-black tabular-nums ${poolPlayers.length === 0 ? 'text-qualify' : 'text-brand'}`}>
                    {poolPlayers.length}
                  </span>
                </div>

                <DroppablePool
                  players={poolPlayers}
                  selectedPlayer={selectedPlayer}
                  onPlayerTap={handlePlayerTap}
                  onPoolTap={handlePoolTap}
                />

                {selectedPlayer && (
                  <p className="mt-2 text-center font-display text-[10px] uppercase tracking-widest text-brand anim-fade">
                    Tap a slot to place
                  </p>
                )}
              </div>
            </div>
          </div>
        </main>

        <DragOverlay>
          {draggedPlayer && <PlayerChip player={draggedPlayer} isDragging />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

// ── Pool ──────────────────────────────────────────────────────────
function DroppablePool({
  players,
  selectedPlayer,
  onPlayerTap,
  onPoolTap,
}: {
  players: LeaguePlayer[]
  selectedPlayer: LeaguePlayer | null
  onPlayerTap: (p: LeaguePlayer) => void
  onPoolTap: () => void
}) {
  return (
    <div
      className="bg-surface-2 rounded-2xl border border-border min-h-[120px] p-2 space-y-1.5"
      onClick={selectedPlayer ? onPoolTap : undefined}
    >
      {players.length === 0 ? (
        <div className="flex items-center justify-center h-20">
          <p className="font-display text-xs text-qualify uppercase tracking-widest">All placed!</p>
        </div>
      ) : (
        players.map(p => (
          <DraggablePlayer
            key={p.id}
            player={p}
            isSelected={selectedPlayer?.id === p.id}
            onTap={() => onPlayerTap(p)}
          />
        ))
      )}
    </div>
  )
}

// ── Player chip (used in overlay) ─────────────────────────────────
export function PlayerChip({ player, isDragging }: { player: LeaguePlayer; isDragging?: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-4 border border-border-bright transition-all ${isDragging ? 'opacity-80 scale-105 shadow-lg' : ''}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{player.name}</p>
        <p className="font-display text-[10px] text-zinc-500 tabular-nums">{player.elo_rating.toFixed(0)} Elo</p>
      </div>
    </div>
  )
}
