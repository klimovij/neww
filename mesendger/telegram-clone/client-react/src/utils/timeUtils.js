// Утилиты для работы с временем

// Функция для форматирования времени последней активности (как в Telegram)
export const formatLastSeen = (lastSeenString, isOnline) => {
  if (isOnline) return 'В сети';
  
  if (!lastSeenString) return 'Не в сети';
  
  const lastSeen = new Date(lastSeenString);
  const now = new Date();
  const diffMs = now - lastSeen;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'только что был(а) в сети';
  if (diffMinutes < 60) return `был(а) в сети ${diffMinutes} мин. назад`;
  if (diffHours < 24) return `был(а) в сети ${diffHours} ч. назад`;
  if (diffDays === 1) return 'был(а) в сети вчера';
  if (diffDays < 7) return `был(а) в сети ${diffDays} дн. назад`;
  
  // Для старых дат показываем дату
  return `был(а) в сети ${lastSeen.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })}`;
};

// Функция для форматирования времени в коротком формате
export const formatShortTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    });
  }
};
