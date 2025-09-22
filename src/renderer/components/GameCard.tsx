import { motion } from 'framer-motion'
import { Badge } from './ui/badge'
import { Game } from '../types/game'
import { Play, X, Tag as TagIcon } from 'lucide-react'
import { useState, useEffect } from 'react'
import { TagDialog } from './TagDialog'
import { useTags } from '../hooks/useTags'
import { gameApi } from '../services/gameApi'
import { getGameDisplayName, getGameTypeDisplayName } from '../utils/gameUtils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Input } from './ui/input'
import { Button } from './ui/button'
import { GameDetailsDialog } from './GameDetailsDialog'

interface GameCardProps {
  game: Game
  onLaunch: (game: Game) => void
  onRemove: (gameId: string) => void
  onTagsUpdated: () => void
  sortBy?: 'name' | 'lastPlay' | 'timePlayed'
}

export function GameCard({ game, onLaunch, onRemove, onTagsUpdated, sortBy }: GameCardProps) {
  const isSteam = game.type === 'steam'
  const isInstalled = Boolean(game.process || game.path)
  const [coverPath, setCoverPath] = useState<string | null>(null)
  const [imageError, setImageError] = useState(false)
  const [showTagDialog, setShowTagDialog] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [showOverrideDialog, setShowOverrideDialog] = useState(false)
  const [processInput, setProcessInput] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [suppressClicksUntil, setSuppressClicksUntil] = useState(0)
  
  // Use the tags hook
  const { tags } = useTags()

  // Load cover image for Steam games
  useEffect(() => {
    if (isSteam && game.appid) {
      console.log('Loading cover image for game:', game.name, 'appid:', game.appid);
      setImageError(false); // Reset error state on appid change

      const appId = game.appid; // Store in local variable to satisfy TypeScript

      gameApi.getCoverImage(appId)
        .then(path => {
          console.log('Cover image path received:', path);
          if (path) {
            setCoverPath(path);
          }
        })
        .catch(error => {
          console.error('Error loading cover image:', error);
        });
    }
  }, [game.appid, isSteam]);

  // Get tags for this specific game
  const gameTags = tags.filter(tag => game.tags?.includes(tag.name))

  // Use utility functions for display
  const displayImage = coverPath;
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
            backgroundImage: displayImage && !imageError ? `url(local-file://${displayImage.replace(/\\/g, '/')})` : 'none',
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
        </div>
      </motion.div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[150px]"
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
