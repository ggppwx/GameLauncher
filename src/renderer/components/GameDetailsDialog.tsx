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

interface GameDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: Game
  onLaunch: (game: Game) => void
  onTagsUpdated: () => void
}

export function GameDetailsDialog({ open, onOpenChange, game, onLaunch, onTagsUpdated }: GameDetailsDialogProps) {
  const [coverPath, setCoverPath] = useState<string | null>(null)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [recentSessions, setRecentSessions] = useState<Array<{ id: string | number; gameId: string; gameName: string; startTime: string; endTime?: string | null; gameTime?: number | null }>>([])

  useEffect(() => {
    if (open && game.type === 'steam' && game.appid) {
      gameApi.getCoverImage(game.appid).then(setCoverPath).catch(() => setCoverPath(null))
    }
  }, [open, game.type, game.appid])

  useEffect(() => {
    if (!open) return
    const load = async () => {
      try {
        const sessions = await statisticsApi.getRecentSessions(50)
        setRecentSessions((sessions || []).filter(s => s.gameId === game.id))
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
            style={{ backgroundImage: coverPath ? `url(local-file://${(coverPath || '').replace(/\\/g, '/')})` : undefined }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20 pointer-events-none" />
          <div className="relative z-10 h-full flex items-center justify-between px-6">
            <div>
              <DialogHeader>
                <DialogTitle className="text-white text-2xl">{game.name}</DialogTitle>
                <DialogDescription className="text-white/70">
                  {game.genres && game.genres.length ? game.genres.slice(0, 3).join(' • ') : game.type.toUpperCase()}
                </DialogDescription>
              </DialogHeader>
              {game.tags && game.tags.length > 0 && (
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
            </div>

            {/* Right: Recent sessions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
              </div>
              <div className="space-y-2">
                {recentSessions && recentSessions.length > 0 ? (
                  recentSessions.slice(0, 10).map(s => (
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


