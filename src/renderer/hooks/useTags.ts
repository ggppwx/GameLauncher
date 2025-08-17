import { useState, useEffect, useCallback } from 'react';
import { Tag } from '../types/game';
import { tagApi } from '../services/tagApi';
import { useToast } from '../components/ui/use-toast';

export interface UseTagsReturn {
  tags: Tag[];
  loading: boolean;
  loadTags: () => Promise<void>;
  addTag: (tag: { name: string; color?: string; isDefault?: boolean }) => Promise<Tag | null>;
  updateTag: (tagId: string, updates: { name?: string; color?: string; isDefault?: boolean }) => Promise<boolean>;
  deleteTag: (tagId: string) => Promise<boolean>;
  getTagById: (tagId: string) => Tag | undefined;
  getTagByName: (name: string) => Tag | undefined;
  refreshTags: () => Promise<void>;
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  // Load tags from database
  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const tagsData = await tagApi.getTags();
      setTags(tagsData);
    } catch (error) {
      console.error('Error loading tags:', error);
      toast({
        title: "Error",
        description: "Failed to load tags",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Add a new tag
  const addTag = useCallback(async (tag: { name: string; color?: string; isDefault?: boolean }): Promise<Tag | null> => {
    try {
      const newTag = await tagApi.addTag(tag);
      setTags(prev => [...prev, newTag]);
      
      toast({
        title: "Tag Added",
        description: `Tag "${tag.name}" has been added`,
      });
      
      return newTag;
    } catch (error) {
      console.error('Error adding tag:', error);
      toast({
        title: "Add Failed",
        description: "Failed to add tag",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  // Update a tag
  const updateTag = useCallback(async (tagId: string, updates: { name?: string; color?: string; isDefault?: boolean }): Promise<boolean> => {
    try {
      const result = await tagApi.updateTag(tagId, updates);
      
      if (result.success) {
        setTags(prev => prev.map(tag => 
          tag.id === tagId ? { ...tag, ...updates } : tag
        ));
        
        toast({
          title: "Tag Updated",
          description: "Tag has been updated successfully",
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating tag:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update tag",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Delete a tag
  const deleteTag = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const result = await tagApi.deleteTag(tagId);
      
      if (result.success) {
        setTags(prev => prev.filter(tag => tag.id !== tagId));
        
        toast({
          title: "Tag Deleted",
          description: "Tag has been deleted successfully",
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete tag",
        variant: "destructive"
      });
      return false;
    }
  }, [toast]);

  // Get tag by ID
  const getTagById = useCallback((tagId: string): Tag | undefined => {
    return tags.find(tag => tag.id === tagId);
  }, [tags]);

  // Get tag by name
  const getTagByName = useCallback((name: string): Tag | undefined => {
    return tags.find(tag => tag.name === name);
  }, [tags]);

  // Refresh tags
  const refreshTags = useCallback(async () => {
    await loadTags();
  }, [loadTags]);

  // Load tags on mount
  useEffect(() => {
    loadTags();
  }, [loadTags]);

  return {
    tags,
    loading,
    loadTags,
    addTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagByName,
    refreshTags,
  };
}
