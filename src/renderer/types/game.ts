export interface Game {
  id: string
  name: string
  path: string
  type: 'steam' | 'custom'
  executable?: string | null
  appid?: string | null
  thumbnail?: string | null
  process?: string | null
  overrideProcess?: string | null
  description?: string | null
  shortDescription?: string | null
  genres?: string[] | null
  releaseDate?: string | null
  developer?: string | null
  publisher?: string | null
  metacritic?: number | null
  categories?: string[] | null
  platforms?: any | null
  backgroundImage?: string | null
  headerImage?: string | null
  capsuleImage?: string | null
  capsuleImageV5?: string | null
  backgroundRaw?: string | null
  coverImage?: string | null
  isFree?: boolean | null
  requiredAge?: number | null
  supportedLanguages?: string | null
  website?: string | null
  recommendations?: number | null
  steamGridCover?: string | null
  steamGridHero?: string | null
  steamGridLogo?: string | null
  steamGridGameId?: string | null
  tags?: string[] | null
  playtime?: number | null
  timeLastPlay?: number | null
}

export interface Tag {
  id: string
  name: string
  color?: string
  isDefault?: boolean
}

export interface GameSession {
  id: string
  gameId: string
  startTime: string
  endTime?: string | null
  duration?: number | null
}

export interface GameStats {
  totalGames: number
  totalPlaytime: number
  totalSessions: number
  averageSessionLength: number
  mostPlayedGame?: string
  recentSessions: GameSession[]
}

export interface MonitoredGame {
  sessionId: string
  gameId: string
  gameName: string
  processName: string
  startTime: Date
  isRunning: boolean
}
