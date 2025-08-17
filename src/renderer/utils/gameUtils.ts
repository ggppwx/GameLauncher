import { Game } from '../types/game';

// Get game display name
export function getGameDisplayName(game: Game): string {
  return game.name || 'Unknown Game';
}

// Get game type display name
export function getGameTypeDisplayName(type: string): string {
  const typeMap: Record<string, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    gog: 'GOG',
    origin: 'Origin',
    uplay: 'Ubisoft Connect',
    battlenet: 'Battle.net',
    custom: 'Custom',
  };
  
  return typeMap[type] || type;
}

// Get game thumbnail URL
export function getGameThumbnailUrl(game: Game): string | null {
  if (game.thumbnail) {
    return `local-file://${game.thumbnail}`;
  }
  
  if (game.coverImage) {
    return `local-file://${game.coverImage}`;
  }
  
  return null;
}

// Get game launch URL
export function getGameLaunchUrl(game: Game): string {
  if (game.type === 'steam' && game.appid) {
    return `steam://rungameid/${game.appid}`;
  }
  
  return game.path || '';
}

// Check if game is installed
export function isGameInstalled(game: Game): boolean {
  // For now, we assume all games in the database are installed
  // In the future, this could check file system
  return true;
}

// Get game file size (placeholder for future implementation)
export function getGameFileSize(game: Game): string {
  // This would require file system access
  return 'Unknown';
}

// Get game last played date (placeholder for future implementation)
export function getGameLastPlayed(game: Game): Date | null {
  // This would require tracking play sessions
  return null;
}

// Format game playtime (placeholder for future implementation)
export function formatGamePlaytime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}
