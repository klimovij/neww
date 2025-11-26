#!/bin/bash
# Скрипт для проверки логов сервера по activity-details

echo "=========================================="
echo "Проверка логов сервера для activity-details"
echo "=========================================="
echo ""

# Проверяем последние логи без фильтра
echo "1. Последние 50 строк логов (без фильтра):"
sudo -u appuser pm2 logs mesendger-server --lines 50 --nostream 2>/dev/null | tail -50

echo ""
echo "=========================================="
echo "2. Поиск строк activity-details:"
sudo -u appuser pm2 logs mesendger-server --lines 200 --nostream 2>/dev/null | grep -i "activity-details" | tail -20

echo ""
echo "=========================================="
echo "3. Поиск диагностических сообщений:"
sudo -u appuser pm2 logs mesendger-server --lines 200 --nostream 2>/dev/null | grep -E "ДИАГНОСТИКА|Уникальных приложений|Всего записей приложений|НЕТ ПРИЛОЖЕНИЙ" | tail -30

echo ""
echo "=========================================="
echo "ВАЖНО:"
echo "1. Откройте детали пользователя в браузере"
echo "2. Затем выполните: pm2 logs mesendger-server --lines 50 | tail -50"
echo "=========================================="

