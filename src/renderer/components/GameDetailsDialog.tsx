import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Play, Tag as TagIcon, Clock, Calendar, ExternalLink } from 'lucide-react'
import { Game } from '../types/game'
import { gameApi } from '../services/gameApi'
import { statisticsApi } from '../services/statisticsApi'
import { TagDialog } from './TagDialog'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import CalendarHeatmap from 'react-calendar-heatmap'
import 'react-calendar-heatmap/dist/styles.css'
import MDEditor from '@uiw/react-md-editor'

// Custom styles for the heatmap
const heatmapStyles = `
  .react-calendar-heatmap .color-empty {
    fill: #f3f4f6;
  }
  .react-calendar-heatmap .color-scale-1 {
    fill: #dbeafe;
  }
  .react-calendar-heatmap .color-scale-2 {
    fill: #93c5fd;
  }
  .react-calendar-heatmap .color-scale-3 {
    fill: #60a5fa;
  }
  .react-calendar-heatmap .color-scale-4 {
    fill: #3b82f6;
  }
  .react-calendar-heatmap .color-scale-5 {
    fill: #1d4ed8;
  }
  .react-calendar-heatmap rect:hover {
    stroke: #3b82f6;
    stroke-width: 2px;
  }
  .react-calendar-heatmap text {
    font-size: 10px;
    fill: #6b7280;
  }
  .react-calendar-heatmap .react-calendar-heatmap-month-label {
    font-size: 10px;
    fill: #6b7280;
  }
  .react-calendar-heatmap .react-calendar-heatmap-weekday-label {
    font-size: 9px;
    fill: #6b7280;
  }
  
  /* Prevent layout shifts and improve rendering performance */
  .react-calendar-heatmap {
    contain: layout style paint;
    will-change: auto;
  }
  
  /* Optimize markdown editor rendering */
  .w-md-editor {
    contain: layout style paint;
  }
  
  /* Prevent dialog content from shaking */
  [data-radix-dialog-content] {
    contain: layout style paint;
    transform: translateZ(0);
  }
`

interface GameDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: Game
  onLaunch: (game: Game) => void
  onTagsUpdated: () => void
}

export function GameDetailsDialog({ open, onOpenChange, game, onLaunch, onTagsUpdated }: GameDetailsDialogProps) {
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string | number; gameId: string; gameName: string; startTime: string; endTime?: string | null; gameTime?: number | null }>>([])

  // Inject heatmap styles once when component mounts
  useEffect(() => {
    const styleId = 'heatmap-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = heatmapStyles
      document.head.appendChild(style)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setRecentSessions([])
      return
    }
    const load = async () => {
      try {
        // Fetch more sessions to ensure we have enough for this specific game
        const sessions = await statisticsApi.getRecentSessions(500)
        const filteredSessions = (sessions || []).filter(s => s.gameId === game.id)
        // Keep only the last 10 sessions for this game
        setRecentSessions(filteredSessions.slice(0, 10))
      } catch (e) {
        console.error('Failed to load recent sessions', e)
        setRecentSessions([])
      }
    }
    load()
  }, [open, game.id])

  const playtimeSeconds = useMemo(() => Math.max(0, (game.playtime || 0) * 60), [game.playtime])
  const lastPlayed = useMemo(() => {
    if (!game.timeLastPlay) return null
    const d = new Date(game.timeLastPlay * 1000)
    return d
  }, [game.timeLastPlay])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1100px] h-[85vh] overflow-hidden p-0">
        {/* Hero header */}
        <div className="relative h-48 bg-black">
          <div
            className="absolute inset-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: game.coverImage ? `url(local-file://${(game.coverImage || '').replace(/\\/g, '/')})` : undefined }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20 pointer-events-none" />
          <div className="relative z-10 h-full flex items-center justify-between px-6">
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-2xl">{game.name}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {game.genres && Array.isArray(game.genres) && game.genres.length ? game.genres.slice(0, 3).join(' • ') : game.type.toUpperCase()}
                </DialogDescription>
              </DialogHeader>
              {game.tags && Array.isArray(game.tags) && game.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {game.tags.map(t => (
                    <Badge key={t} variant="secondary" className="bg-white/20 text-white border-0">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button className="btn-steam" onClick={() => onLaunch(game)}>
                <Play className="w-4 h-4 mr-2" /> Play
              </Button>
              {game.website && (
                <Button variant="outline" onClick={() => window.electronAPI.openExternal(game.website!)}>
                  <ExternalLink className="w-4 h-4 mr-2" /> Website
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowTagDialog(true)}>
                <TagIcon className="w-4 h-4 mr-2" /> Manage Tags
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-[calc(85vh-12rem)] overflow-y-auto p-6 space-y-6 bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-4">
              {game.shortDescription || game.description ? (
                <p className="text-gray-800 leading-relaxed">
                  {game.shortDescription || game.description}
                </p>
              ) : null}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {typeof game.metacritic === 'number' && (
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">Metacritic</div>
                    <div className="font-semibold">{game.metacritic}</div>
                  </div>
                )}
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-gray-500">Playtime</div>
                  <div className="font-semibold">{statisticsApi.formatPlaytime(playtimeSeconds)}</div>
                </div>
                <div className="p-3 rounded bg-gray-50">
                  <div className="text-gray-500">Last Played</div>
                  <div className="font-semibold flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    {lastPlayed ? lastPlayed.toLocaleString() : 'Never'}
                  </div>
                </div>
                {game.developer && (
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">Developer</div>
                    <div className="font-semibold">{game.developer}</div>
                  </div>
                )}
                {game.publisher && (
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">Publisher</div>
                    <div className="font-semibold">{game.publisher}</div>
                  </div>
                )}
                {game.releaseDate && (
                  <div className="p-3 rounded bg-gray-50">
                    <div className="text-gray-500">Release Date</div>
                    <div className="font-semibold">{game.releaseDate}</div>
                  </div>
                )}
              </div>

              {/* Last 14 days bar chart */}
              <TwoWeeksChart recentSessions={recentSessions} />
              
              {/* Playdate Heatmap */}
              <PlaydateHeatmap recentSessions={recentSessions} />
              
              {/* Game Notes */}
              <GameNotesEditor game={game} />
            </div>

            {/* Right: Recent sessions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
              </div>
              <div className="space-y-2">
                {recentSessions && recentSessions.length > 0 ? (
                  recentSessions.map(s => (
                    <div key={s.id} className="p-3 rounded border bg-gray-50 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-800">{statisticsApi.formatDate(s.startTime)}</div>
                        <div className="text-xs text-gray-600">{s.endTime ? 'Completed' : 'Ongoing'}</div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {s.gameTime ? statisticsApi.formatPlaytime(s.gameTime) : '—'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-600">No recent sessions for this game.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tag Dialog */}
        <TagDialog
          open={showTagDialog}
          onOpenChange={setShowTagDialog}
          game={game}
          onTagsUpdated={onTagsUpdated}
        />
      </DialogContent>
    </Dialog>
  )
}


interface TwoWeeksChartProps {
  recentSessions: Array<{ id: string | number; gameId: string; gameName: string; startTime: string; endTime?: string | null; gameTime?: number | null }>
}

function TwoWeeksChart({ recentSessions }: TwoWeeksChartProps) {
  const data = useMemo(() => {
    const today = new Date()
    // Build last 14 days keys
    const dayKeys: string[] = []
    const fmt = (d: Date) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      dayKeys.push(fmt(d))
    }

    const totalsByDay = new Map<string, number>()
    dayKeys.forEach(k => totalsByDay.set(k, 0))

    for (const s of recentSessions || []) {
      if (!s.startTime) continue
      const d = new Date(s.startTime)
      const key = fmt(d)
      if (!totalsByDay.has(key)) continue
      let seconds = 0
      if (typeof s.gameTime === 'number' && s.gameTime > 0) seconds = s.gameTime
      else if (s.endTime) seconds = Math.max(0, Math.floor((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 1000))
      const prev = totalsByDay.get(key) || 0
      totalsByDay.set(key, prev + seconds)
    }

    const out = dayKeys.map(k => {
      const [y, m, d] = k.split('-').map(Number)
      const label = new Date(y, (m || 1) - 1, d || 1).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      return { key: k, label, seconds: totalsByDay.get(k) || 0 }
    })
    return out
  }, [recentSessions])

  const hasData = data.some(d => (d.seconds || 0) > 0)

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-800">Last 14 Days</h4>
      </div>
      <div className="w-full h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" stroke="#6b7280" tick={{ fontSize: 10 }} />
            <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} tickFormatter={(v) => statisticsApi.formatPlaytime(Number(v))} />
            <Tooltip formatter={(v: any) => [statisticsApi.formatPlaytime(Number(v)), 'Playtime']} />
            <Bar dataKey="seconds" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Playtime" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasData && (
        <div className="text-xs text-gray-500 mt-2">No playtime recorded in the last 14 days.</div>
      )}
    </div>
  )
}

interface PlaydateHeatmapProps {
  recentSessions: Array<{ id: string | number; gameId: string; gameName: string; startTime: string; endTime?: string | null; gameTime?: number | null }>
}

function PlaydateHeatmap({ recentSessions }: PlaydateHeatmapProps) {
  const heatmapData = useMemo(() => {
    // Create a map of dates to playtime
    const playtimeByDate = new Map<string, number>()
    
    for (const session of recentSessions || []) {
      if (!session.startTime) continue
      const sessionDate = new Date(session.startTime)
      const dateKey = sessionDate.toISOString().split('T')[0] // YYYY-MM-DD format
      
      let playtimeSeconds = 0
      if (typeof session.gameTime === 'number' && session.gameTime > 0) {
        playtimeSeconds = session.gameTime
      } else if (session.endTime) {
        playtimeSeconds = Math.max(0, Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000))
      }
      
      const existing = playtimeByDate.get(dateKey) || 0
      playtimeByDate.set(dateKey, existing + playtimeSeconds)
    }
    
    // Convert to array format expected by react-calendar-heatmap
    const values = Array.from(playtimeByDate.entries()).map(([date, count]) => ({
      date,
      count: Math.floor(count / 60) // Convert seconds to minutes for better scaling
    }))
    
    return values
  }, [recentSessions])
  
  const formatPlaytime = (minutes: number) => {
    if (minutes === 0) return 'No playtime'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }
  
  const hasData = heatmapData.some(d => d.count > 0)
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-gray-800">Playtime Heatmap (Last Year)</h4>
        <p className="text-xs text-gray-600 mt-1">Each square represents a day. Darker colors indicate more playtime.</p>
      </div>
      
      {hasData ? (
        <div className="space-y-3">
          <CalendarHeatmap
            startDate={new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)} // 365 days ago
            endDate={new Date()}
            values={heatmapData}
            classForValue={(value) => {
              if (!value || value.count === 0) {
                return 'color-empty'
              }
              if (value.count < 30) {
                return 'color-scale-1' // Less than 30 minutes
              }
              if (value.count < 60) {
                return 'color-scale-2' // 30-60 minutes
              }
              if (value.count < 120) {
                return 'color-scale-3' // 1-2 hours
              }
              return 'color-scale-4' // More than 2 hours
            }}
            titleForValue={(value) => {
              if (!value) return 'No data'
              return `${new Date(value.date).toLocaleDateString()}: ${formatPlaytime(value.count)}`
            }}
            showWeekdayLabels={true}
            onClick={(value) => {
              if (value) {
                console.log(`Clicked on ${value.date}: ${formatPlaytime(value.count)}`)
              }
            }}
          />
        </div>
      ) : (
        <div className="text-xs text-gray-500 py-8 text-center">
          No playtime recorded in the last year.
        </div>
      )}
    </div>
  )
}

interface GameNotesEditorProps {
  game: Game
}

function GameNotesEditor({ game }: GameNotesEditorProps) {
  const [notes, setNotes] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Load notes when component mounts or game changes
  useEffect(() => {
    const loadNotes = async () => {
      setIsLoading(true)
      try {
        const gameNotes = await gameApi.getGameNotes(game.id)
        setNotes(gameNotes || '')
      } catch (error) {
        console.error('Failed to load notes:', error)
        setNotes('')
      } finally {
        setIsLoading(false)
      }
    }

    loadNotes()
  }, [game.id])

  // Auto-save with debounce
  useEffect(() => {
    if (isLoading) return // Don't save while loading
    
    const timeoutId = setTimeout(async () => {
      setIsSaving(true)
      try {
        await gameApi.updateGameNotes(game.id, notes)
      } catch (error) {
        console.error('Failed to save notes:', error)
      } finally {
        setIsSaving(false)
      }
    }, 1000) // Save after 1 second of no typing

    return () => clearTimeout(timeoutId)
  }, [notes, game.id, isLoading])

  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800">Game Notes</h4>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="text-xs text-gray-500">Loading...</div>
          )}
          {isSaving && (
            <div className="text-xs text-gray-500">Saving...</div>
          )}
        </div>
      </div>
      
      {isLoading ? (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          Loading notes...
        </div>
      ) : (
        <MDEditor
          value={notes}
          onChange={(value) => setNotes(value || '')}
          height={300}
          data-color-mode="light"
          visibleDragbar={false}
          hideToolbar={false}
          preview="preview"
        />
      )}
    </div>
  )
}


