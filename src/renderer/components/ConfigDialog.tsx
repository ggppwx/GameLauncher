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
  const [steamApiKey, setSteamApiKey] = useState('')
  const [steamUserId, setSteamUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadSteamPath()
    }
  }, [open])

  const loadSteamPath = async () => {
    try {
      const cfg = await window.electronAPI.getConfig()
      setSteamPath(cfg?.steamPath || '')
      setSteamApiKey(cfg?.steamApiKey || '')
      setSteamUserId(cfg?.steamUserId || '')
    } catch (error) {
      console.error('Error loading configuration:', error)
      toast({
        title: "Error",
        description: "Failed to load configuration",
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
      await window.electronAPI.setConfig({
        steamPath,
        steamApiKey,
        steamUserId,
      })
      toast({
        title: "Success",
        description: "Configuration saved successfully"
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving configuration:', error)
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleWebLogin = async () => {
    try {
      const res = await window.electronAPI.steamWebLogin()
      if (res?.success) {
        setSteamApiKey(res.key || '')
        if (res.steamId) setSteamUserId(res.steamId)
        // Refresh full config so persona is picked up if present
        try {
          const cfg = await window.electronAPI.getConfig()
          setSteamApiKey(cfg?.steamApiKey || res.key || '')
          setSteamUserId(cfg?.steamUserId || res.steamId || '')
        } catch (_) {}
        toast({ title: 'Login successful', description: res.persona ? `Hello, ${res.persona}` : 'Steam Web API key saved' })
      } else {
        toast({ title: 'Login cancelled', description: 'No changes made' })
      }
    } catch (error) {
      toast({ title: 'Login failed', description: 'Unable to complete Steam login', variant: 'destructive' })
    }
  }

  const handleLogout = async () => {
    try {
      const res = await window.electronAPI.steamWebLogout()
      if (res.success) {
        setSteamApiKey('')
        toast({ title: 'Logged out', description: 'Cleared saved Steam Web API key' })
      }
    } catch (error) {
      toast({ title: 'Logout failed', description: 'Unable to clear Steam login', variant: 'destructive' })
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

          <div className="space-y-2">
            <Label>Steam Account</Label>
            <div className="space-y-2">
              <Input
                value={steamApiKey}
                onChange={(e) => setSteamApiKey(e.target.value)}
                placeholder="Steam Web API Key"
              />
              <Input
                value={steamUserId}
                onChange={(e) => setSteamUserId(e.target.value)}
                placeholder="SteamID64 (e.g., 7656119XXXXXXXXXX)"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => window.electronAPI.openExternal('https://steamcommunity.com/dev/apikey')}
                >
                  Get API Key
                </Button>
                <Button
                  variant="default"
                  onClick={handleWebLogin}
                >
                  Web Login
                </Button>
                {steamApiKey && (
                  <Button
                    variant="destructive"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                )}
                <p className="text-xs text-gray-500">
                  Provide your Steam Web API key and SteamID64 to import your library.
                </p>
              </div>
            </div>
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
