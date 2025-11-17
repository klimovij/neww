// Хелпер для получения базового URL API
export const getApiBaseURL = () => {
  // Используем переменную окружения если задана
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Используем текущий origin (работает для production через nginx)
  if (typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Fallback на localhost для разработки
  return 'http://localhost:5000';
};

