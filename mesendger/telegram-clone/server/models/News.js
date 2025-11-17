// Модель новости
class News {
  constructor({ id, title, content, authorId, createdAt = new Date() }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.authorId = authorId;
    this.createdAt = createdAt;
  }
}

module.exports = News;
