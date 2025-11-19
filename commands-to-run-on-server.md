# Команды для проверки и исправления проблемы с импортом на сервере

Выполните эти команды на сервере в порядке их следования:

## 1. Перейти в директорию проекта
```bash
cd /var/www/mesendger/telegram-clone/client-react
```

## 2. Проверить существование файла api.js
```bash
ls -lh src/services/api.js
```
Должен показать файл. Если его нет - проблема найдена.

## 3. Проверить структуру директорий
```bash
pwd
ls -la src/
ls -la src/components/Sidebar/
```

## 4. Проверить импорт в SidebarMobile.jsx
```bash
grep -n "import api from" src/components/Sidebar/SidebarMobile.jsx
```
Должно показать: `8:import api from '../../services/api';`

## 5. Проверить, что все файлы синхронизированы с git
```bash
git status
git log --oneline -5
```

## 6. Если нужно обновить с git
```bash
cd /var/www/mesendger
git pull origin main
```

## 7. Очистить кеш и build директорию
```bash
cd /var/www/mesendger/telegram-clone/client-react
rm -rf node_modules/.cache
rm -rf build
```

## 8. Пересобрать проект
```bash
npm run build
```

## 9. Если ошибка повторилась, проверить node_modules
```bash
# Проверить, что axios установлен
npm list axios

# Если нет, установить зависимости заново
npm install
```

## 10. Альтернативный вариант - использовать абсолютный путь
Если проблема продолжается, можно попробовать использовать абсолютный путь от src/:

В файле `src/components/Sidebar/SidebarMobile.jsx` изменить:
```javascript
import api from '../../services/api';
```
на:
```javascript
import api from 'services/api';
```

Но это потребует настройки path mapping в package.json или jsconfig.json.

## Быстрая проверка одной командой
```bash
cd /var/www/mesendger/telegram-clone/client-react && \
echo "🔍 Проверка файла api.js:" && \
[ -f "src/services/api.js" ] && echo "✅ Файл существует" || echo "❌ Файл не найден" && \
echo "🔍 Проверка импорта:" && \
grep -n "import api from" src/components/Sidebar/SidebarMobile.jsx && \
echo "🔍 Очистка кеша:" && \
rm -rf node_modules/.cache build && \
echo "✅ Готово к пересборке"
```

