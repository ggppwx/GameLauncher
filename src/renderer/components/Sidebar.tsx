import { motion } from 'framer-motion'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Filter, Search, Tag as TagIcon } from 'lucide-react'
import { useTags } from '../hooks/useTags'
import { Game } from '../types/game'
import { getUniqueGameTypes } from '../utils/filterUtils'

interface SidebarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: string
  onFilterChange: (value: string) => void
  installedOnly?: boolean
  onInstalledOnlyChange?: (value: boolean) => void
  selectedTags: string[]
  onTagFilterChange: (tagNames: string[]) => void
  games: Game[] // Add games prop for dynamic filtering
}

export function Sidebar({ 
  searchTerm, 
  onSearchChange, 
  filterType, 
  onFilterChange, 
  installedOnly = false,
  onInstalledOnlyChange,
  selectedTags, 
  onTagFilterChange,
  games
}: SidebarProps) {
  // Use the tags hook instead of managing state locally
  const { tags } = useTags()

  // Get unique game types from actual games
  const availableGameTypes = getUniqueGameTypes(games)

  const toggleTag = (tagName: string) => {
    const newSelectedTags = selectedTags.includes(tagName)
      ? selectedTags.filter(name => name !== tagName)
      : [...selectedTags, tagName]
    onTagFilterChange(newSelectedTags)
  }

  const clearTagFilters = () => {
    onTagFilterChange([])
  }

  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="w-80 bg-white/90 backdrop-blur-md border-r border-white/20 p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Filters</h2>
        </div>

        <div className="space-y-4">
          {/* Installed toggle - right below Filters */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Installed</Label>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                installedOnly
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => onInstalledOnlyChange && onInstalledOnlyChange(!installedOnly)}
            >
              <div className={`w-3 h-3 rounded-full ${installedOnly ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <span className="text-sm font-medium flex-1">Installed Only</span>
            </motion.div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">
              Search Games
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 bg-white/50 border-white/20 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-type" className="text-sm font-medium text-gray-700">
              Game Type
            </Label>
            <Select value={filterType} onValueChange={onFilterChange}>
              <SelectTrigger className="bg-white/50 border-white/20 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Games ({games.length})</SelectItem>
                {availableGameTypes.map(type => {
                  const count = games.filter(game => game.type === type).length
                  return (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          

          {/* Tag Filters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <TagIcon className="w-4 h-4" />
                Tags
              </Label>
              {selectedTags.length > 0 && (
                <button
                  onClick={clearTagFilters}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Clear
                </button>
              )}
            </div>
            
            {tags.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tags.map(tag => (
                  <motion.div
                    key={tag.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedTags.includes(tag.name)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => toggleTag(tag.name)}
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium flex-1">{tag.name}</span>
                    {selectedTags.includes(tag.name) && (
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">No tags available</p>
            )}
          </div>

          {/* Selected Tags Display */}
          {selectedTags.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                Active Filters
              </Label>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tagName => {
                  const tag = tags.find(t => t.name === tagName)
                  return tag ? (
                    <Badge
                      key={tagName}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100"
                      onClick={() => toggleTag(tagName)}
                    >
                      {tag.name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="pt-4 border-t border-white/20"
        >
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Quick Tips:</p>
            <ul className="space-y-1 text-xs">
              <li>• Use search to find games quickly</li>
              <li>• Filter by type to organize your library</li>
              <li>• Use tags to categorize your games</li>
              <li>• Right-click games to add tags</li>
              <li>• Steam games are auto-detected</li>
              <li>• Custom games are saved locally</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </motion.aside>
  )
}
