import React, { createContext, useContext, useState, useEffect } from 'react';

const SystemTimeContext = createContext();

export const useSystemTime = () => {
  const context = useContext(SystemTimeContext);
  if (!context) {
    throw new Error('useSystemTime must be used within a SystemTimeProvider');
  }
  return context;
};

export const SystemTimeProvider = ({ children }) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    // Обновляем время каждую секунду
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Функция для получения времени через указанное количество минут
  const getTimeAfterMinutes = (minutes) => {
    return new Date(currentTime.getTime() + minutes * 60000);
  };

  // Функция для форматирования времени как в Clock.jsx
  const formatSystemTime = (date = currentTime, options = {}) => {
    const defaultOptions = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    return date.toLocaleTimeString('ru-RU', { ...defaultOptions, ...options });
  };

  // Функция для форматирования даты как в Clock.jsx
  const formatSystemDate = (date = currentTime, options = {}) => {
    const defaultOptions = {
      weekday: 'long',
      day: '2-digit',
      month: 'long'
    };
    return date.toLocaleDateString('ru-RU', { ...defaultOptions, ...options });
  };

  // Функция для получения строки даты для input[type="date"]
  const getDateString = (date = currentTime) => {
    return date.toISOString().split('T')[0];
  };

  // Функция для получения строки времени для input[type="time"]
  const getTimeString = (date = currentTime) => {
    return date.toTimeString().slice(0, 5);
  };

  const value = {
    currentTime,
    getTimeAfterMinutes,
    formatSystemTime,
    formatSystemDate,
    getDateString,
    getTimeString
  };

  return (
    <SystemTimeContext.Provider value={value}>
      {children}
    </SystemTimeContext.Provider>
  );
};
