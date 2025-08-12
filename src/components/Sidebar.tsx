import { motion } from 'framer-motion'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Filter, Search } from 'lucide-react'

interface SidebarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  filterType: string
  onFilterChange: (value: string) => void
}

export function Sidebar({ searchTerm, onSearchChange, filterType, onFilterChange }: SidebarProps) {
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
                <SelectItem value="all">All Games</SelectItem>
                <SelectItem value="steam">Steam</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
              <li>• Steam games are auto-detected</li>
              <li>• Custom games are saved locally</li>
            </ul>
          </div>
        </motion.div>
      </motion.div>
    </motion.aside>
  )
}
