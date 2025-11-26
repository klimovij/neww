#!/bin/bash
# Скрипт для проверки, сколько приложений возвращает API

cd /var/www/mesendger

echo "=========================================="
echo "Проверка API /api/activity-details"
echo "=========================================="
echo ""
echo "ВНИМАНИЕ: Нужно указать username, start и end даты"
echo ""
echo "Использование:"
echo "  ./CHECK_APPLICATIONS_API.sh USERNAME START_DATE END_DATE"
echo ""
echo "Пример:"
echo "  ./CHECK_APPLICATIONS_API.sh Ksendzik_Oleg 2025-01-17 2025-01-17"
echo ""

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "❌ Ошибка: нужно указать все параметры"
    exit 1
fi

USERNAME=$1
START_DATE=$2
END_DATE=$3

echo "Параметры запроса:"
echo "  Username: $USERNAME"
echo "  Start: $START_DATE"
echo "  End: $END_DATE"
echo ""

# Проверяем, запущен ли PM2 сервер
if ! pm2 list | grep -q "mesendger-server.*online"; then
    echo "⚠️  ВНИМАНИЕ: сервер mesendger-server не запущен или не online"
    echo ""
fi

# Запрашиваем API (нужно использовать токен или проверить через curl)
echo "Запрос к API..."
echo "URL: http://localhost:3000/api/activity-details?username=${USERNAME}&start=${START_DATE}&end=${END_DATE}"
echo ""

# Используем curl для запроса
RESPONSE=$(curl -s "http://localhost:3000/api/activity-details?username=${USERNAME}&start=${START_DATE}&end=${END_DATE}" 2>&1)

if [ $? -eq 0 ]; then
    echo "✅ Ответ получен"
    echo ""
    
    # Извлекаем количество приложений из JSON
    APPLICATIONS_COUNT=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(len(data.get('applications', [])))" 2>/dev/null)
    
    if [ -n "$APPLICATIONS_COUNT" ]; then
        echo "📊 Количество приложений в ответе API: $APPLICATIONS_COUNT"
        echo ""
        
        if [ "$APPLICATIONS_COUNT" -lt 10 ]; then
            echo "⚠️  ВНИМАНИЕ: Очень мало приложений! Возможно, проблема в фильтрации."
            echo ""
        fi
        
        # Показываем первые 5 приложений
        echo "Примеры приложений (первые 5):"
        echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    apps = data.get('applications', [])
    for i, app in enumerate(apps[:5]):
        print(f\"  {i+1}. {app.get('procName', 'N/A')} - {app.get('windowTitle', 'N/A')[:50]}\")
except Exception as e:
    print(f'Ошибка парсинга: {e}')
" 2>/dev/null
    else
        echo "⚠️  Не удалось извлечь количество приложений из ответа"
        echo "Полный ответ (первые 500 символов):"
        echo "$RESPONSE" | head -c 500
        echo "..."
    fi
else
    echo "❌ Ошибка при запросе к API"
    echo "$RESPONSE"
fi

echo ""
echo "=========================================="
echo "Также проверьте логи PM2:"
echo "  pm2 logs mesendger-server --lines 50 | grep 'activity-details'"
echo "=========================================="

