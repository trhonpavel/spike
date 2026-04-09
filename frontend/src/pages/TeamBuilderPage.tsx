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

export interface SlotAnnotation {
  locked: boolean
  tentative: boolean
  note: string
}

type Annotations = { [slotIndex: number]: SlotAnnotation }

function emptyAnnotation(): SlotAnnotation {
  return { locked: false, tentative: false, note: '' }
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

function buildAnnotations(slots: { slot_index: number; locked: boolean; tentative: boolean; note: string | null }[]): Annotations {
  const a: Annotations = {}
  for (const s of slots) {
    a[s.slot_index] = { locked: s.locked, tentative: s.tentative, note: s.note ?? '' }
  }
  return a
}

function compositionToSlots(assignment: Assignment, annotations: Annotations) {
  return Array.from({ length: 7 }, (_, i) => {
    const ann = annotations[i] ?? emptyAnnotation()
    return {
      slot_index: i,
      player1_id: assignment[`s${i}p1`]?.id ?? null,
      player2_id: IS_ALTERNATE(i) ? null : (assignment[`s${i}p2`]?.id ?? null),
      locked: ann.locked,
      tentative: ann.tentative,
      note: ann.note || null,
    }
  })
}

export default function TeamBuilderPage() {
  const { slug } = useParams<{ slug: string }>()
  const queryClient = useQueryClient()
  const appAuth = !!getSessionToken()
  const storedToken = slug ? getLeagueToken(slug) : null
  const token = storedToken || ''
  const isAdmin = appAuth || !!storedToken

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [annotations, setAnnotations] = useState<Annotations>({})
  const [draggedPlayer, setDraggedPlayer] = useState<LeaguePlayer | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<LeaguePlayer | null>(null)
  const [editingNote, setEditingNote] = useState<number | null>(null)  // slot_index
  const [editingPlayerNote, setEditingPlayerNote] = useState<number | null>(null)  // player id
  const [editPlayerNoteValue, setEditPlayerNoteValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['league-teams', slug],
    queryFn: () => leagueApi.getTeams(slug!),
    enabled: !!slug,
  })

  const initFromData = useCallback((serverData: NonNullable<typeof data>) => {
    setAssignment(buildAssignment(serverData.slots))
    setAnnotations(buildAnnotations(serverData.slots))
  }, [])

  if (data && assignment === null) {
    initFromData(data)
  }

  const updatePlayerMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { locked?: boolean; tentative?: boolean; note?: string | null } }) =>
      leagueApi.updatePlayer(slug!, id, data, token),
    onSuccess: (updated) => {
      // Update player in local assignment state immediately
      setAssignment(prev => {
        if (!prev) return prev
        const next = { ...prev }
        for (const posId of Object.keys(next)) {
          if (next[posId]?.id === updated.id) {
            next[posId] = updated
          }
        }
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['league', slug] })
      setEditingPlayerNote(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveMutation = useMutation({
    mutationFn: () => leagueApi.saveTeams(slug!, compositionToSlots(assignment!, annotations), token),
    onSuccess: (updated) => {
      queryClient.setQueryData(['league-teams', slug], updated)
      setAssignment(buildAssignment(updated.slots))
      setAnnotations(buildAnnotations(updated.slots))
      toast.success('Saved!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

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

      if (srcPos && srcPos !== 'pool') {
        if (occupant) {
          next[srcPos] = occupant
        } else {
          delete next[srcPos]
        }
      }

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
    movePlayer(Number(e.active.id), e.over.id as PositionId)
  }

  function handlePlayerTap(player: LeaguePlayer) {
    setSelectedPlayer(prev => prev?.id === player.id ? null : player)
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

  function toggleAnnotation(slotIndex: number, field: 'locked' | 'tentative') {
    setAnnotations(prev => {
      const curr = prev[slotIndex] ?? emptyAnnotation()
      const next = { ...curr, [field]: !curr[field] }
      // locked and tentative are mutually exclusive
      if (field === 'locked' && next.locked) next.tentative = false
      if (field === 'tentative' && next.tentative) next.locked = false
      return { ...prev, [slotIndex]: next }
    })
  }

  function setNote(slotIndex: number, note: string) {
    setAnnotations(prev => ({
      ...prev,
      [slotIndex]: { ...(prev[slotIndex] ?? emptyAnnotation()), note },
    }))
  }

  function resetAll() {
    setAssignment({})
    setAnnotations({})
  }

  function getSlotElo(slotIndex: number): number | null {
    if (!assignment) return null
    const p1 = assignment[`s${slotIndex}p1`]
    const p2 = assignment[`s${slotIndex}p2`]
    if (!p1 && !p2) return null
    if (IS_ALTERNATE(slotIndex)) return p1?.elo_rating ?? null
    if (p1 && p2) return Math.round((p1.elo_rating + p2.elo_rating) / 2)
    return p1?.elo_rating ?? p2?.elo_rating ?? null
  }

  function getMaxSeedElo(): number {
    const elos = Array.from({ length: 5 }, (_, i) => getSlotElo(i)).filter((e): e is number => e !== null)
    return elos.length > 0 ? Math.max(...elos) : 1500
  }

  const poolPlayers = getPoolPlayers()
  const maxElo = getMaxSeedElo()

  if (isLoading || assignment === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand/20 border-t-brand rounded-full anim-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
          <div className="flex items-center gap-2">
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-xl border border-border text-zinc-500 hover:text-accent-red hover:border-accent-red/30 font-display text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              title="Reset all slots"
            >
              Reset
            </button>
            {isAdmin && (
              <button
                onClick={() => saveMutation.mutate()}
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
        </div>
      </header>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <main className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">

            {/* === LEFT: SLOTS === */}
            <div className="space-y-3">
              <h2 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Seeds</h2>

              {Array.from({ length: 5 }, (_, i) => {
                const ann = annotations[i] ?? emptyAnnotation()
                const slotElo = getSlotElo(i)
                const eloBarPct = slotElo !== null ? Math.round((slotElo / maxElo) * 100) : 0
                const isLocked = ann.locked
                const isTentative = ann.tentative

                return (
                  <div
                    key={i}
                    className={`rounded-2xl border p-3 transition-all ${
                      isLocked ? 'bg-qualify/5 border-qualify/30' :
                      isTentative ? 'bg-status-draft/5 border-status-draft/30' :
                      'bg-surface-2 border-border'
                    }`}
                  >
                    {/* Slot header */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={`score-num text-2xl ${isLocked ? 'text-qualify' : isTentative ? 'text-status-draft' : 'text-brand'}`}>
                        {i + 1}
                      </span>
                      <span className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500 flex-1">
                        {SLOT_LABELS[i]}
                      </span>

                      {/* Elo strength bar */}
                      {slotElo !== null && (
                        <div className="flex items-center gap-1.5 mr-1">
                          <div className="w-16 h-1.5 bg-surface-4 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${isLocked ? 'bg-qualify' : 'bg-accent-blue'}`}
                              style={{ width: `${eloBarPct}%` }}
                            />
                          </div>
                          <span className="font-display text-[10px] text-zinc-500 tabular-nums w-10 text-right">{slotElo}</span>
                        </div>
                      )}

                      {/* Annotation buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleAnnotation(i, 'locked')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${isLocked ? 'text-qualify bg-qualify/10' : 'text-zinc-600 hover:text-qualify'}`}
                          title="Lock — confirmed"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => toggleAnnotation(i, 'tentative')}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${isTentative ? 'text-status-draft bg-status-draft/10' : 'text-zinc-600 hover:text-status-draft'}`}
                          title="Tentative — unsure"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingNote(editingNote === i ? null : i)}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${ann.note ? 'text-accent-blue bg-accent-blue/10' : 'text-zinc-600 hover:text-accent-blue'}`}
                          title="Note"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Note input */}
                    {editingNote === i && (
                      <div className="mb-2.5 anim-fade">
                        <input
                          type="text" autoComplete="off"
                          value={ann.note}
                          onChange={e => setNote(i, e.target.value)}
                          placeholder="Add note..."
                          maxLength={300}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNote(null) }}
                          className="w-full px-3 py-2 bg-surface-3 border border-accent-blue/40 rounded-xl text-white placeholder-zinc-600 focus:outline-none text-sm transition-all"
                        />
                      </div>
                    )}

                    {/* Note display */}
                    {ann.note && editingNote !== i && (
                      <div
                        className="mb-2.5 px-3 py-1.5 rounded-xl bg-accent-blue/10 border border-accent-blue/20 cursor-pointer"
                        onClick={() => setEditingNote(i)}
                      >
                        <p className="text-xs text-zinc-400">{ann.note}</p>
                      </div>
                    )}

                    {/* Player slots */}
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
                            onTap={() => {
                              if (selectedPlayer && selectedPlayer.id !== player?.id) {
                                handleSlotTap(posId)
                              } else if (player) {
                                handlePlayerTap(player)
                              } else {
                                handleSlotTap(posId)
                              }
                            }}
                            selectedPlayerId={selectedPlayer?.id}
                            locked={isLocked}
                            onLock={player && isAdmin ? (e) => { e.stopPropagation(); updatePlayerMutation.mutate({ id: player.id, data: { locked: !player.locked, tentative: player.locked ? player.tentative : false } }) } : undefined}
                            onTentative={player && isAdmin ? (e) => { e.stopPropagation(); updatePlayerMutation.mutate({ id: player.id, data: { tentative: !player.tentative, locked: player.tentative ? player.locked : false } }) } : undefined}
                            onNote={player && isAdmin ? (e) => { e.stopPropagation(); if (editingPlayerNote === player.id) { setEditingPlayerNote(null) } else { setEditingPlayerNote(player.id); setEditPlayerNoteValue(player.note || '') } } : undefined}
                            noteEditing={editingPlayerNote === player?.id}
                            noteValue={editingPlayerNote === player?.id ? editPlayerNoteValue : player?.note || ''}
                            onNoteChange={setEditPlayerNoteValue}
                            onNoteCommit={() => player && updatePlayerMutation.mutate({ id: player.id, data: { note: editPlayerNoteValue.trim() || null } })}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}

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
                          onTap={() => {
                            if (selectedPlayer && selectedPlayer.id !== player?.id) {
                              handleSlotTap(posId)
                            } else if (player) {
                              handlePlayerTap(player)
                            } else {
                              handleSlotTap(posId)
                            }
                          }}
                          selectedPlayerId={selectedPlayer?.id}
                          locked={false}
                          onLock={player && isAdmin ? (e) => { e.stopPropagation(); updatePlayerMutation.mutate({ id: player.id, data: { locked: !player.locked, tentative: player.locked ? player.tentative : false } }) } : undefined}
                          onTentative={player && isAdmin ? (e) => { e.stopPropagation(); updatePlayerMutation.mutate({ id: player.id, data: { tentative: !player.tentative, locked: player.tentative ? player.locked : false } }) } : undefined}
                          onNote={player && isAdmin ? (e) => { e.stopPropagation(); if (editingPlayerNote === player.id) { setEditingPlayerNote(null) } else { setEditingPlayerNote(player.id); setEditPlayerNoteValue(player.note || '') } } : undefined}
                          noteEditing={editingPlayerNote === player?.id}
                          noteValue={editingPlayerNote === player?.id ? editPlayerNoteValue : player?.note || ''}
                          onNoteChange={setEditPlayerNoteValue}
                          onNoteCommit={() => player && updatePlayerMutation.mutate({ id: player.id, data: { note: editPlayerNoteValue.trim() || null } })}
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
                  <h2 className="font-display text-xs font-bold uppercase tracking-widest text-zinc-500">Available</h2>
                  <span className={`font-display text-xs font-black tabular-nums ${poolPlayers.length === 0 ? 'text-qualify' : 'text-brand'}`}>
                    {poolPlayers.length}
                  </span>
                </div>

                <div
                  className="bg-surface-2 rounded-2xl border border-border min-h-[120px] p-2 space-y-1.5"
                  onClick={selectedPlayer ? handlePoolTap : undefined}
                >
                  {poolPlayers.length === 0 ? (
                    <div className="flex items-center justify-center h-20">
                      <p className="font-display text-xs text-qualify uppercase tracking-widest">All placed!</p>
                    </div>
                  ) : (
                    poolPlayers.map(p => (
                      <DraggablePlayer
                        key={p.id}
                        player={p}
                        isSelected={selectedPlayer?.id === p.id}
                        onTap={() => handlePlayerTap(p)}
                      />
                    ))
                  )}
                </div>

                {selectedPlayer && (
                  <p className="mt-2 text-center font-display text-[10px] uppercase tracking-widest text-brand anim-fade">
                    Tap a slot to place
                  </p>
                )}

                {/* Legend */}
                <div className="mt-4 space-y-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-qualify/30 border border-qualify/50 shrink-0" />
                    <span className="font-display text-[10px] text-zinc-500 uppercase tracking-widest">Locked — confirmed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-status-draft/30 border border-status-draft/50 shrink-0" />
                    <span className="font-display text-[10px] text-zinc-500 uppercase tracking-widest">Tentative — unsure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-accent-blue/30 border border-accent-blue/50 shrink-0" />
                    <span className="font-display text-[10px] text-zinc-500 uppercase tracking-widest">Has note</span>
                  </div>
                </div>
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
