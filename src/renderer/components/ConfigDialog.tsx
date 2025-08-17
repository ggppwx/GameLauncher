import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { FolderOpen, Save, X } from 'lucide-react'
import { useToast } from './ui/use-toast'

interface ConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ConfigDialog({ open, onOpenChange }: ConfigDialogProps) {
  const [steamPath, setSteamPath] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSteamPath()
    }
  }, [open])

  const loadSteamPath = async () => {
    try {
      const path = await window.electronAPI.getSteamPath()
      setSteamPath(path || '')
    } catch (error) {
      console.error('Error loading Steam path:', error)
      toast({
        title: "Error",
        description: "Failed to load Steam path configuration",
        variant: "destructive"
      })
    }
  }

  const handleSelectSteamPath = async () => {
    try {
      const selectedPath = await window.electronAPI.selectGameFolder()
      if (selectedPath) {
        setSteamPath(selectedPath)
      }
    } catch (error) {
      console.error('Error selecting Steam path:', error)
      toast({
        title: "Error",
        description: "Failed to select Steam path",
        variant: "destructive"
      })
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await window.electronAPI.setSteamPath(steamPath)
      toast({
        title: "Success",
        description: "Steam path configuration saved successfully"
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving Steam path:', error)
      toast({
        title: "Error",
        description: "Failed to save Steam path configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5" />
            <span>Configuration</span>
          </DialogTitle>
          <DialogDescription>
            Configure Steam installation path and other application settings.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="steam-path">Steam Installation Path</Label>
            <div className="flex space-x-2">
              <Input
                id="steam-path"
                value={steamPath}
                onChange={(e) => setSteamPath(e.target.value)}
                placeholder="C:\Program Files (x86)\Steam"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleSelectSteamPath}
                title="Browse for Steam folder"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Select the folder where Steam is installed. This is used to detect and scan your Steam games.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
