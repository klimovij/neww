import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
// Глобальная переменная для звука уведомлений чата
// Пробуем разные пути в зависимости от окружения
if (process.env.NODE_ENV === 'production') {
  // В production пробуем путь из build
  window.MESSAGE_SOUND_URL = '/message2.mp3';
} else {
  // В development используем путь из public
  window.MESSAGE_SOUND_URL = '/message2.mp3';
}
// Если файл не найден, функция notificationSound.js попробует альтернативный путь

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
