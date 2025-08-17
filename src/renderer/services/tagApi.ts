import { apiClient } from './api';
import { Tag } from '../types/game';

export interface TagUpdate {
  name?: string;
  color?: string;
  isDefault?: boolean;
}

export class TagApi {
  // Get all tags
  async getTags(): Promise<Tag[]> {
    return apiClient.invoke<Tag[]>('getTags');
  }

  // Add a new tag
  async addTag(tag: { name: string; color?: string; isDefault?: boolean }): Promise<Tag> {
    return apiClient.invoke<Tag>('addTag', tag);
  }

  // Note: These methods are not yet implemented in the Electron API
  // They would need to be added to the backend first
  
  // Update a tag
  async updateTag(tagId: string, updates: TagUpdate): Promise<{ success: boolean }> {
    throw new Error('updateTag not yet implemented in backend');
  }

  // Delete a tag
  async deleteTag(tagId: string): Promise<{ success: boolean }> {
    throw new Error('deleteTag not yet implemented in backend');
  }

  // Get tag by ID
  async getTagById(tagId: string): Promise<Tag | null> {
    throw new Error('getTagById not yet implemented in backend');
  }

  // Get tag by name
  async getTagByName(name: string): Promise<Tag | null> {
    throw new Error('getTagByName not yet implemented in backend');
  }

  // Get default tags
  async getDefaultTags(): Promise<Tag[]> {
    throw new Error('getDefaultTags not yet implemented in backend');
  }
}

// Singleton instance
export const tagApi = new TagApi();
