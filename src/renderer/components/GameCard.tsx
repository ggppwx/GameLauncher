import { motion } from 'framer-motion'
import { Badge } from './ui/badge'
import { Game } from '../types/game'
import { Play, X, Tag as TagIcon, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TagDialog } from './TagDialog'
import { useTags } from '../hooks/useTags'
import { gameApi } from '../services/gameApi'
import { getGameDisplayName, getGameTypeDisplayName } from '../utils/gameUtils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { GameDetailsDialog } from './GameDetailsDialog'
import { useToast } from './ui/use-toast'

interface GameCardProps {
  game: Game
  onLaunch: (game: Game) => void
  onRemove: (gameId: string) => void
  onTagsUpdated: () => void
  sortBy?: 'name' | 'lastPlay' | 'timePlayed'
  hybridScore?: number
  expectedReward?: number
}

export function GameCard({ game, onLaunch, onRemove, onTagsUpdated, sortBy, hybridScore, expectedReward }: GameCardProps) {
  const isInstalled = Boolean(game.process || game.path)
  
  // Debug logging for hybrid score
  if (hybridScore !== undefined) {
    console.log(`GameCard for ${game.name}: hybridScore = ${hybridScore}`);
  }
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [processInput, setProcessInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [suppressClicksUntil, setSuppressClicksUntil] = useState(0)
  const [isRetrievingData, setIsRetrievingData] = useState(false)
  
  const { toast } = useToast()
  
  // Use the tags hook
  const { tags } = useTags()

  // Get tags for this specific game
  const gameTags = tags.filter(tag => game.tags?.includes(tag.name))

  // Use utility functions for display
  // Use coverImage from database - it's already downloaded and stored during import
  const displayImage = game.coverImage;
  const displayName = getGameDisplayName(game);
  const typeDisplayName = getGameTypeDisplayName(game.type);

  const getFooterText = () => {
    if (sortBy === 'name') {
      return displayName
    }
    if (sortBy === 'lastPlay' && game.timeLastPlay) {
      const d = new Date(game.timeLastPlay * 1000)
      return `Last played: ${d.toLocaleString()}`
    }
    if (sortBy === 'timePlayed' && typeof game.playtime === 'number') {
      const hours = Math.floor(game.playtime / 60)
      const minutes = game.playtime % 60
      return `Playtime: ${hours}h ${minutes}m`
    }
    return null
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  const handleAddTags = () => {
    setContextMenu(null)
    setShowTagDialog(true)
  }

  const handleTagsUpdated = () => {
    onTagsUpdated()
  }

  const handleRetrieveMissingData = async () => {
    setContextMenu(null)
    
    if (game.type !== 'steam') {
      toast({
        title: 'Not Supported',
        description: 'Only Steam games are supported for metadata retrieval',
        variant: 'destructive'
      })
      return
    }

    setIsRetrievingData(true)
    try {
      const result = await gameApi.retrieveMissingData(game.id)
      toast({
        title: 'Success',
        description: result.message || 'Metadata retrieved successfully'
      })
      // Refresh the game list to show updated data
      onTagsUpdated()
    } catch (error: any) {
      console.error('Error retrieving missing data:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to retrieve metadata',
        variant: 'destructive'
      })
    } finally {
      setIsRetrievingData(false)
    }
  }

  const footerText = getFooterText()

  return (
    <>
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        whileTap={{ scale: 0.98 }}
        className="cursor-pointer rounded-md overflow-hidden bg-black/60"
        style={{ willChange: 'transform' }}
        onContextMenu={handleContextMenu}
        onClick={() => {
          if (Date.now() < suppressClicksUntil) return
          setShowDetails(true)
        }}
      >
        <div
          className={`game-card-steam relative overflow-hidden ${!isInstalled ? 'opacity-60' : ''}`}
          style={{ 
            backgroundImage: displayImage ? `url(local-file://${displayImage.replace(/\\/g, '/')})` : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: !isInstalled ? 'grayscale(100%)' : undefined
          }}
        >
        {/* Background overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        
        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(game.id);
          }}
          className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors z-10"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Tiny process label for debugging (top) */}
        {(game.overrideProcess || game.process) && (
          <div className="absolute top-2 right-10 z-10">
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-black/60 text-white/80">
              {game.overrideProcess || game.process}
            </span>
          </div>
        )}

        {/* Tags display */}
        {gameTags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-3rem)]">
            {gameTags.slice(0, 3).map(tag => (
              <Badge
                key={tag.id}
                variant="secondary"
                className="text-xs px-2 py-1 bg-black/50 text-white border-0"
                style={{ backgroundColor: tag.color + 'CC' }}
              >
                {tag.name}
              </Badge>
            ))}
            {gameTags.length > 3 && (
              <Badge
                variant="secondary"
                className="text-xs px-2 py-1 bg-black/50 text-white border-0"
              >
                +{gameTags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Game Info - positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="game-card-title text-white mb-2">
            {displayName}
          </h3>
          
          <div className="game-card-meta">
            {game.genres && Array.isArray(game.genres) && game.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {game.genres.slice(0, 2).map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-black/50 text-white text-xs rounded"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}
            
            {game.shortDescription || game.description ? (
              <p className="text-xs text-white/80 line-clamp-2 mb-3">
                {game.shortDescription || game.description}
              </p>
            ) : null}
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/70">
                {typeDisplayName}
              </span>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLaunch(game);
                }}
                className="btn-steam text-xs px-3 py-1"
              >
                <Play className="w-3 h-3 mr-1" />
                Play
              </button>
            </div>
          </div>
        </div>

        </div>
        {/* Footer below cover without overlap (always rendered) */}
        <div className="w-full bg-gray-800/80 text-white text-[10px] px-3 py-2 min-h-[28px] -mt-px">
          {footerText || ''}
          {hybridScore !== undefined && expectedReward !== undefined && (
            <div className="mt-1 flex justify-center gap-2">
              <Badge variant="secondary" className="text-[10px] px-2 py-1 bg-purple-600 text-white font-bold border border-purple-400">
                Score: {hybridScore.toFixed(3)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-2 py-1 bg-blue-600 text-white font-bold border border-blue-400">
                Reward: {expectedReward.toFixed(3)}
              </Badge>
            </div>
          )}
        </div>
      </motion.div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[180px]"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
        >
          <button
            onClick={handleAddTags}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
          >
            <TagIcon className="w-4 h-4" />
            Add Tags
          </button>
          <button
            onClick={() => {
              setContextMenu(null)
              setProcessInput((game.overrideProcess || game.process || '').replace(/^\"|\"$/g, ''))
              setShowOverrideDialog(true)
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
          >
            Set Process Override
          </button>
          {game.type === 'steam' && (
            <button
              onClick={handleRetrieveMissingData}
              disabled={isRetrievingData}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrievingData ? 'animate-spin' : ''}`} />
              {isRetrievingData ? 'Retrieving...' : 'Retrieve Missing Data'}
            </button>
          )}
        </div>
      )}

      {/* Tag Dialog */}
      <TagDialog
        open={showTagDialog}
        onOpenChange={setShowTagDialog}
        game={game}
        onTagsUpdated={handleTagsUpdated}
      />

      {/* Override Process Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Process Override</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={processInput}
              onChange={(e) => setProcessInput(e.target.value)}
              placeholder="game.exe"
            />
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowOverrideDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const v = processInput.trim()
                if (!v.toLowerCase().endsWith('.exe')) return
                try {
                  await gameApi.setOverrideProcess(game.id, v)
                  setShowOverrideDialog(false)
                  onTagsUpdated()
                } catch (e) {
                  console.error('Failed to set override process', e)
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Game Details Dialog */}
      <GameDetailsDialog
        open={showDetails}
        onOpenChange={(open) => {
          setShowDetails(open)
          if (!open) {
            setSuppressClicksUntil(Date.now() + 300)
          }
        }}
        game={game}
        onLaunch={onLaunch}
        onTagsUpdated={handleTagsUpdated}
      />
    </>
  )
}
