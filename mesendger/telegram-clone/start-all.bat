@echo off
REM Запуск сервера и клиента для telegram-clone

REM 1. Запуск сервера (Node.js backend) на порту 5000
start "server" cmd /k "cd /d %~dp0server && npm install && set PORT=5000 && npm run start"

REM 2. Запуск клиента (React frontend) на порту 3001 (по умолчанию, если 3000 занят)
start "client-react" cmd /k "cd /d %~dp0client-react && npm install && npm start"

REM 3. Открыть приложение в браузере (опционально)
REM timeout /t 5 >nul
REM start http://localhost:5000
REM start http://localhost:3001

echo Все процессы запущены. Закройте это окно, чтобы завершить все процессы вручную.
pause
