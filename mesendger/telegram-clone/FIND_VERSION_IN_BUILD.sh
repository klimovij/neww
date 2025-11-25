#!/bin/bash

# Скрипт для поиска версии в собранных файлах

BUILD_DIR="/var/www/mesendger/mesendger/telegram-clone/client-react/build"

echo "🔍 Поиск версии V5.0 в build файлах..."
echo ""

if [ ! -d "$BUILD_DIR" ]; then
  echo "❌ Директория не существует: $BUILD_DIR"
  exit 1
fi

echo "📦 Поиск в JS файлах..."
echo ""

# Ищем все JS файлы и проверяем версию
find "$BUILD_DIR/static/js" -name "*.js" -type f | while read jsfile; do
  filename=$(basename "$jsfile")
  echo "=== $filename ==="
  
  # Поиск V5.0
  if grep -q "V5.0" "$jsfile" 2>/dev/null; then
    echo "✅ V5.0 НАЙДЕНА!"
    grep -o "V5.0[^\"' ]*" "$jsfile" | head -3 | sed 's/^/   /'
    echo ""
  fi
  
  # Поиск BUILD 2025-01-20
  if grep -q "BUILD 2025-01-20" "$jsfile" 2>/dev/null; then
    echo "✅ BUILD 2025-01-20 НАЙДЕН!"
    grep -o "BUILD 2025-01-20" "$jsfile" | head -1 | sed 's/^/   /'
    echo ""
  fi
  
  # Поиск старых версий
  if grep -q "V2\.0\|V3\.0" "$jsfile" 2>/dev/null; then
    echo "⚠️  Найдены старые версии:"
    grep -o "V[23]\.[0-9][^\"' ]*" "$jsfile" | head -3 | sed 's/^/   /'
    echo ""
  fi
  
  # Поиск маркера компонента
  if grep -q "НАЧАЛО КОМПОНЕНТА" "$jsfile" 2>/dev/null; then
    echo "✅ Маркер компонента найден:"
    grep -o "НАЧАЛО КОМПОНЕНТА[^\"']*" "$jsfile" | head -1 | sed 's/^/   /'
    echo ""
  fi
  
  echo "---"
  echo ""
done

echo ""
echo "📄 Проверка index.html..."
if [ -f "$BUILD_DIR/index.html" ]; then
  echo "   Ссылки на JS файлы:"
  grep -o 'src="/static/js/[^"]*"' "$BUILD_DIR/index.html" | sed 's/^/   /'
else
  echo "   ❌ index.html не найден"
fi

