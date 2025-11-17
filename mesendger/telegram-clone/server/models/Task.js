// Модель задачи

class Task {
  constructor({ id, title, description, assignedTo, deadline, status = 'open', createdAt = new Date(), authorId }) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.assignedTo = assignedTo;
    this.deadline = deadline;
    this.status = status;
    this.createdAt = createdAt;
    this.authorId = authorId;
  }
}

module.exports = Task;
