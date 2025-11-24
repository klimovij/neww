# 🔧 СРОЧНОЕ РЕШЕНИЕ: Обновление сервера

## ❌ Проблема:
- В базе есть данные (16 пользователей в `remote_work_time_logs`)
- Но модалка показывает только 1 пользователя
- **Сервер НЕ обновлён** - код не читает данные из обеих таблиц

## ✅ Решение: Обновить сервер

### Вариант 1: Через Google Cloud Console (САМЫЙ ПРОСТОЙ)

1. Откройте: https://console.cloud.google.com/compute/instances
2. Найдите инстанс: `instance-20251117-204836`
3. Нажмите кнопку **"SSH"** (откроется терминал в браузере)
4. Вставьте и выполните эту команду:

```bash
bash <(curl -s https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh)
```

Подождите 2-3 минуты, пока выполнится обновление.

### Вариант 2: Через SSH (если у вас есть доступ)

```bash
ssh username@35.232.108.72

# Затем выполните:
bash <(curl -s https://raw.githubusercontent.com/klimovij/neww/main/mesendger/telegram-clone/deploy/update-server.sh)
```

### Вариант 3: Прямая команда (скопируйте целиком)

```bash
cd /tmp && sudo rm -rf mesendger-god && sudo git clone https://github.com/klimovij/neww.git mesendger-god && sudo rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/ && sudo chown -R appuser:appuser /var/www/mesendger && cd /var/www/mesendger/server && sudo -u appuser npm install --production && cd /var/www/mesendger/client-react && sudo -u appuser npm install && sudo -u appuser CI=false npm run build && sudo -u appuser pm2 restart all && sudo -u appuser pm2 status
```

## ✅ После обновления:

1. Подождите 1-2 минуты (сервер перезапускается)
2. Обновите страницу в браузере (F5 или Ctrl+F5)
3. Откройте модалку "Рабочее время"
4. Выберите дату (вчера или сегодня)
5. Нажмите "Показать отчет"
6. **Должны появиться данные!**

## 📊 Что изменится:

- Модалка будет читать данные из ОБЕИХ таблиц:
  - `work_time_logs` (старые данные)
  - `remote_work_time_logs` (новые данные от агентов)
- Все 16 пользователей будут видны в отчете
- Данные активности также будут отображаться

## ⚠️ Важно:

- **Обновление займет 2-3 минуты**
- **Сервер временно будет недоступен** во время перезапуска
- **После обновления всё должно работать!**

