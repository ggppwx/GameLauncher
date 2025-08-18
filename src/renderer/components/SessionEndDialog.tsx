import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { GameSession } from '../types/game'
import { sessionApi } from '../services/sessionApi'
import { Clock, Calendar, Play, X } from 'lucide-react'

interface SessionEndDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionInfo: {
    sessionId: string
    startTime: string
    endTime: string
    gameTime: number
    gameName: string
  } | null
}

export function SessionEndDialog({ open, onOpenChange, sessionInfo }: SessionEndDialogProps) {
  const [gameStats, setGameStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && sessionInfo) {
      loadGameStats()
    }
  }, [open, sessionInfo])

  const loadGameStats = async () => {
    if (!sessionInfo) return
    
    setLoading(true)
    try {
      // For now, we'll show basic session info
      // In the future, we could fetch game stats here
      setGameStats({
        total_sessions: 1,
        total_playtime: sessionInfo.gameTime,
        avg_session_time: sessionInfo.gameTime
      })
    } catch (error) {
      console.error('Error loading game stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!sessionInfo) return null

  const formattedPlaytime = sessionApi.formatPlaytime(sessionInfo.gameTime)
  const startDate = new Date(sessionInfo.startTime).toLocaleString()
  const endDate = new Date(sessionInfo.endTime).toLocaleString()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Play className="w-5 h-5 text-green-500" />
            <span>Session Complete</span>
          </DialogTitle>
          <DialogDescription>
            Your gaming session for {sessionInfo.gameName} has ended.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Summary */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Game</span>
                  <span className="text-sm font-semibold">{sessionInfo.gameName}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Playtime
                  </span>
                  <span className="text-sm font-semibold text-green-600">{formattedPlaytime}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Started
                  </span>
                  <span className="text-sm text-gray-500">{startDate}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Ended
                  </span>
                  <span className="text-sm text-gray-500">{endDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Statistics (if available) */}
          {gameStats && (
            <Card>
              <CardContent className="pt-6">
                <h4 className="text-sm font-semibold mb-3">Game Statistics</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Sessions</span>
                    <span className="text-sm font-medium">{gameStats.total_sessions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Playtime</span>
                    <span className="text-sm font-medium">{sessionApi.formatPlaytime(gameStats.total_playtime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Session</span>
                    <span className="text-sm font-medium">{sessionApi.formatPlaytime(gameStats.avg_session_time)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
