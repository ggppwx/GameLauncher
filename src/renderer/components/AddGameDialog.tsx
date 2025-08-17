import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { FolderOpen, Gamepad2 } from 'lucide-react'

interface AddGameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddGame: (name: string, path: string) => void
}

export function AddGameDialog({ open, onOpenChange, onAddGame }: AddGameDialogProps) {
  const [gameName, setGameName] = useState('')
  const [gamePath, setGamePath] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (gameName.trim() && gamePath.trim()) {
      onAddGame(gameName.trim(), gamePath.trim())
      setGameName('')
      setGamePath('')
    }
  }

  const handleBrowsePath = async () => {
    try {
      const path = await window.electronAPI.selectGameFolder()
      if (path) {
        setGamePath(path)
      }
    } catch (error) {
      console.error('Error browsing path:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5 text-blue-600" />
            <span>Add Custom Game</span>
          </DialogTitle>
          <DialogDescription>
            Add a custom game to your library by providing the game name and folder path.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="game-name">Game Name</Label>
            <Input
              id="game-name"
              type="text"
              placeholder="Enter game name..."
              value={gameName}
              onChange={(e) => setGameName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="game-path">Game Path</Label>
            <div className="flex space-x-2">
              <Input
                id="game-path"
                type="text"
                placeholder="Select game folder..."
                value={gamePath}
                onChange={(e) => setGamePath(e.target.value)}
                required
                readOnly
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowsePath}
                className="shrink-0"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!gameName.trim() || !gamePath.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
            >
              Add Game
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
