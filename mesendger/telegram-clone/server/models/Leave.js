// Модель отгула
class Leave {
  constructor({ id, userId, startDate, endDate, reason, status = 'pending' }) {
    this.id = id;
    this.userId = userId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.reason = reason;
    this.status = status;
  }
}

module.exports = Leave;
