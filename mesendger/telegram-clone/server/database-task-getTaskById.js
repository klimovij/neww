class DatabaseTask {
  constructor(db) {
    this.db = db;
  }
  // Получить задачу по id
  async getTaskById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
        if (err) reject(new Error(`Ошибка при получении задачи с id ${id}: ${err.message}`));
        else resolve(row);
      });
    });
  }
}

module.exports = DatabaseTask;