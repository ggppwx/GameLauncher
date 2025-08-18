import { Game } from '../types/game';

// Filter games by search term
export function filterGamesBySearch(games: Game[], searchTerm: string): Game[] {
  if (!searchTerm.trim()) {
    return games;
  }
  
  const term = searchTerm.toLowerCase();
  return games.filter(game => 
    game.name.toLowerCase().includes(term) ||
    game.developer?.toLowerCase().includes(term) ||
    game.publisher?.toLowerCase().includes(term) ||
    (game.genres && Array.isArray(game.genres) && game.genres.some(genre => genre.toLowerCase().includes(term)))
  );
}

// Filter games by type
export function filterGamesByType(games: Game[], gameType: string): Game[] {
  if (gameType === 'all') {
    return games;
  }
  
  return games.filter(game => game.type === gameType);
}

// Filter games by tags
export function filterGamesByTags(games: Game[], selectedTags: string[]): Game[] {
  if (selectedTags.length === 0) {
    return games;
  }
  
  return games.filter(game => {
    if (!game.tags || game.tags.length === 0) {
      return false;
    }
    
    return selectedTags.some(tagName => game.tags?.includes(tagName));
  });
}

// Get unique game types from games
export function getUniqueGameTypes(games: Game[]): string[] {
  const types = new Set(games.map(game => game.type));
  return Array.from(types).sort();
}

// Get unique tags from games
export function getUniqueTagsFromGames(games: Game[]): string[] {
  const tags = new Set<string>();
  
  games.forEach(game => {
    if (game.tags) {
      game.tags.forEach(tag => tags.add(tag));
    }
  });
  
  return Array.from(tags).sort();
}

// Get unique developers from games
export function getUniqueDevelopers(games: Game[]): string[] {
  const developers = new Set<string>();
  
  games.forEach(game => {
    if (game.developer) {
      developers.add(game.developer);
    }
  });
  
  return Array.from(developers).sort();
}

// Get unique publishers from games
export function getUniquePublishers(games: Game[]): string[] {
  const publishers = new Set<string>();
  
  games.forEach(game => {
    if (game.publisher) {
      publishers.add(game.publisher);
    }
  });
  
  return Array.from(publishers).sort();
}

// Get unique genres from games
export function getUniqueGenres(games: Game[]): string[] {
  const genres = new Set<string>();
  
  games.forEach(game => {
    if (game.genres && Array.isArray(game.genres)) {
      game.genres.forEach(genre => genres.add(genre));
    }
  });
  
  return Array.from(genres).sort();
}

// Sort games by various criteria
export function sortGames(games: Game[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc'): Game[] {
  const sorted = [...games];
  
  switch (sortBy) {
    case 'name':
      sorted.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
      break;
      
    case 'type':
      sorted.sort((a, b) => {
        const typeA = a.type.toLowerCase();
        const typeB = b.type.toLowerCase();
        return sortOrder === 'asc' ? typeA.localeCompare(typeB) : typeB.localeCompare(typeA);
      });
      break;
      
    case 'developer':
      sorted.sort((a, b) => {
        const devA = (a.developer || '').toLowerCase();
        const devB = (b.developer || '').toLowerCase();
        return sortOrder === 'asc' ? devA.localeCompare(devB) : devB.localeCompare(devA);
      });
      break;
      
    case 'publisher':
      sorted.sort((a, b) => {
        const pubA = (a.publisher || '').toLowerCase();
        const pubB = (b.publisher || '').toLowerCase();
        return sortOrder === 'asc' ? pubA.localeCompare(pubB) : pubB.localeCompare(pubA);
      });
      break;
      
    case 'releaseDate':
      sorted.sort((a, b) => {
        const dateA = new Date(a.releaseDate || 0);
        const dateB = new Date(b.releaseDate || 0);
        return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
      });
      break;
      
    default:
      // Default to name sorting
      sorted.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
      });
  }
  
  return sorted;
}
