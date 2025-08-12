export interface Game {
  id: string
  name: string
  path: string
  type: 'steam' | 'custom'
  executable?: string | null
}
