export interface Game {
  id: string
  name: string
  path: string
  type: 'steam' | 'custom'
  executable?: string | null
  appid?: string | null
  thumbnail?: string | null
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
}

export interface Tag {
  id: string
  name: string
  color?: string
  isDefault?: boolean
}
