class TagService {
  constructor(db) {
    this.db = db;
  }

  async getAllTags() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM tags ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async addTag(tag) {
    return new Promise((resolve, reject) => {
      const tagId = tag.id || `tag-${Date.now()}`;
      this.db.run(
        'INSERT INTO tags (id, name, color, isDefault) VALUES (?, ?, ?, ?)',
        [tagId, tag.name, tag.color || '#6B7280', tag.isDefault || 0],
        function (err) {
          if (err) reject(err);
          else resolve({ id: tagId, ...tag });
        }
      );
    });
  }

  async updateTag(tagId, updates) {
    return new Promise((resolve, reject) => {
      const { name, color, isDefault } = updates;
      this.db.run(
        'UPDATE tags SET name = ?, color = ?, isDefault = ? WHERE id = ?',
        [name, color, isDefault, tagId],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });
  }

  async deleteTag(tagId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM tags WHERE id = ?', [tagId], function (err) {
        if (err) reject(err);
        else resolve({ success: true });
      });
    });
  }

  async getTagById(tagId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tags WHERE id = ?', [tagId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getTagByName(name) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tags WHERE name = ?', [name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getDefaultTags() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM tags WHERE isDefault = 1 ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = TagService;
