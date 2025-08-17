import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Badge } from './ui/badge'
import { Game, Tag } from '../types/game'
import { Plus, X, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTags } from '../hooks/useTags'
import { gameApi } from '../services/gameApi'
import { tagApi } from '../services/tagApi'
import { useToast } from './ui/use-toast'

interface TagDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  game: Game
  onTagsUpdated: () => void
}

export function TagDialog({ open, onOpenChange, game, onTagsUpdated }: TagDialogProps) {
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddingTag, setIsAddingTag] = useState(false)
  const { tags, refreshTags } = useTags()
  const { toast } = useToast()

  const gameName = game.name

  useEffect(() => {
    if (open) {
      // Load current tags for this game
      setSelectedTagNames(game.tags || [])
      setSearchTerm('')
      setNewTagName('')
    }
  }, [open, game.tags])

  const handleAddTag = async () => {
    if (!newTagName.trim()) return

    setIsAddingTag(true)
    try {
      // Add the new tag
      const newTag = await tagApi.addTag({ name: newTagName.trim() })
      
      // Add it to the game's tags
      const updatedTagNames = [...selectedTagNames, newTag.name]
      await gameApi.addTagsToGame(game.id, updatedTagNames)
      
      // Update local state
      setSelectedTagNames(updatedTagNames)
      setNewTagName('')
      
      // Refresh tags list
      await refreshTags()
      
      // Notify parent component
      onTagsUpdated()
      
      toast({
        title: "Success",
        description: `Tag "${newTag.name}" added to ${gameName}`
      })
    } catch (error) {
      console.error('Error adding tag:', error)
      toast({
        title: "Error",
        description: "Failed to add tag",
        variant: "destructive"
      })
    } finally {
      setIsAddingTag(false)
    }
  }

  const toggleTag = async (tagName: string) => {
    const isCurrentlySelected = selectedTagNames.includes(tagName)
    const updatedTagNames = isCurrentlySelected
      ? selectedTagNames.filter(name => name !== tagName)
      : [...selectedTagNames, tagName]

    try {
      await gameApi.addTagsToGame(game.id, updatedTagNames)
      setSelectedTagNames(updatedTagNames)
      onTagsUpdated()
      
      toast({
        title: "Success",
        description: isCurrentlySelected 
          ? `Tag "${tagName}" removed from ${gameName}`
          : `Tag "${tagName}" added to ${gameName}`
      })
    } catch (error) {
      console.error('Error updating tags:', error)
      toast({
        title: "Error",
        description: "Failed to update tags",
        variant: "destructive"
      })
    }
  }

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Tags for {gameName}</DialogTitle>
          <DialogDescription>
            Add or remove tags to organize and categorize your games.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Tags */}
          {selectedTagNames.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Current Tags</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTagNames.map(tagName => {
                  const tag = tags.find(t => t.name === tagName)
                  return tag ? (
                    <Badge 
                      key={tagName}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => toggleTag(tagName)}
                    >
                      {tag.name}
                      <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}

          {/* Add New Tag */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Create New Tag</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                disabled={isAddingTag}
              />
              <Button 
                size="sm" 
                onClick={handleAddTag}
                disabled={!newTagName.trim() || isAddingTag}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Available Tags</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tags List */}
          <div className="max-h-48 overflow-y-auto space-y-2">
            {filteredTags.map(tag => (
              <motion.div
                key={tag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedTagNames.includes(tag.name)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => toggleTag(tag.name)}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-sm font-medium">{tag.name}</span>
                  {tag.isDefault && (
                    <Badge variant="outline" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
