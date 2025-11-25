#!/bin/bash

# Скрипт для проверки заголовков, которые отдаёт Nginx

echo "🔍 Проверка заголовков Nginx для index.html..."
echo ""

# Проверяем заголовки через curl
echo "📡 Запрос к index.html:"
curl -I http://localhost/ 2>/dev/null | grep -i "cache\|expires\|last-modified" || echo "   Заголовки кэширования не найдены"

echo ""
echo "📡 Полные заголовки ответа:"
curl -I http://localhost/ 2>/dev/null

echo ""
echo "📄 Проверка содержимого index.html:"
curl -s http://localhost/ | grep -o 'src="/static/js/[^"]*"' | head -1

echo ""
echo "✅ Проверка завершена"

