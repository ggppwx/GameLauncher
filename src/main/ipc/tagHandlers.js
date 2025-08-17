const { ipcMain } = require('electron');

function setupTagHandlers(tagService) {
  // Get all tags
  ipcMain.handle('get-tags', () => {
    return tagService.getAllTags();
  });

  // Add a new tag
  ipcMain.handle('add-tag', (event, tag) => {
    return tagService.addTag(tag);
  });

  // Update tag
  ipcMain.handle('update-tag', (event, { tagId, updates }) => {
    return tagService.updateTag(tagId, updates);
  });

  // Delete tag
  ipcMain.handle('delete-tag', (event, tagId) => {
    return tagService.deleteTag(tagId);
  });

  // Get tag by ID
  ipcMain.handle('get-tag-by-id', (event, tagId) => {
    return tagService.getTagById(tagId);
  });

  // Get tag by name
  ipcMain.handle('get-tag-by-name', (event, name) => {
    return tagService.getTagByName(name);
  });

  // Get default tags
  ipcMain.handle('get-default-tags', () => {
    return tagService.getDefaultTags();
  });
}

module.exports = { setupTagHandlers };
