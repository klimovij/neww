// Утилита для правильного форматирования времени с учетом временных зон

export const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  // Правильная обработка времени с учетом временных зон
  let messageDate;
  
  // Если время приходит как UTC строка, но без 'Z' на конце
  if (typeof timestamp === 'string' && 
      timestamp.includes('T') && 
      !timestamp.includes('Z') && 
      !timestamp.includes('+')) {
    // Принудительно интерпретируем как UTC
    messageDate = new Date(timestamp + 'Z');
  } else {
    // Для остальных случаев используем стандартную обработку
    messageDate = new Date(timestamp);
  }
  
  return messageDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatMessageDate = (timestamp) => {
  if (!timestamp) return '';
  
  let messageDate;
  
  // Аналогичная обработка для даты
  if (typeof timestamp === 'string' && 
      timestamp.includes('T') && 
      !timestamp.includes('Z') && 
      !timestamp.includes('+')) {
    messageDate = new Date(timestamp + 'Z');
  } else {
    messageDate = new Date(timestamp);
  }
  
  return messageDate.toLocaleDateString('ru-RU');
};

export const formatMessageDateTime = (timestamp) => {
  if (!timestamp) return '';
  
  let messageDate;
  
  if (typeof timestamp === 'string' && 
      timestamp.includes('T') && 
      !timestamp.includes('Z') && 
      !timestamp.includes('+')) {
    messageDate = new Date(timestamp + 'Z');
  } else {
    messageDate = new Date(timestamp);
  }
  
  return messageDate.toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};
