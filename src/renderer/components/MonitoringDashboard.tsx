import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { RefreshCw, Play, Square, Clock, Monitor } from 'lucide-react';
import { MonitoredGame } from '../types/game';
import { monitorApi } from '../services/monitorApi';
import { sessionApi } from '../services/sessionApi';
import { useToast } from './ui/use-toast';

export function MonitoringDashboard() {
  const [monitoredGames, setMonitoredGames] = useState<MonitoredGame[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadMonitoredGames = async () => {
    try {
      setLoading(true);
      const games = await monitorApi.getMonitoredGames();
      setMonitoredGames(games);
    } catch (error) {
      console.error('Error loading monitored games:', error);
      toast({
        title: "Error",
        description: "Failed to load monitored games",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await sessionApi.endGameSession(sessionId);
      toast({
        title: "Session Ended",
        description: "Game session has been ended",
      });
      loadMonitoredGames(); // Refresh the list
    } catch (error) {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to end game session",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadMonitoredGames();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMonitoredGames, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (monitoredGames.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Monitor className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No games are currently being monitored</p>
            <p className="text-sm">Launch a game to start monitoring</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Active Game Sessions</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={loadMonitoredGames}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {monitoredGames.map((game) => (
          <Card key={game.sessionId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{game.gameName}</h4>
                    <Badge variant={game.isRunning ? "default" : "secondary"}>
                      {game.isRunning ? (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Running
                        </>
                      ) : (
                        <>
                          <Square className="h-3 w-3 mr-1" />
                          Stopped
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-3 w-3" />
                      <span>Process: {game.processName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Started: {game.startTime.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!game.isRunning && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEndSession(game.sessionId)}
                    >
                      End Session
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
