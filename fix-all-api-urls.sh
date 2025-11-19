#!/bin/bash
# Массовая замена всех localhost:5000 на относительные пути

cd /var/www/mesendger/client-react/src

echo "🔧 Исправление всех localhost:5000..."

# Список файлов для исправления
files=(
  "components/Messenger.jsx"
  "components/TemplatesManagementMobile.jsx"
  "components/Chat/ScheduledMessageModal.jsx"
  "components/Chat/ScheduledMessagesList.jsx"
  "components/Chat/EditScheduledMessageModal.jsx"
  "components/Modals/TemplatesManagementModal.jsx"
  "components/LeavesWorktimeModal.jsx"
  "components/NewsFeed.jsx"
  "components/Modals/HRWorktimeReviewModal.jsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Исправляю: $file"
    # Создаем резервную копию
    cp "$file" "$file.bak"
    # Заменяем все варианты
    sed -i "s|'http://localhost:5000/api/|'/api/|g" "$file"
    sed -i "s|\"http://localhost:5000/api/|\"/api/|g" "$file"
    sed -i "s|\`http://localhost:5000/api/|\`/api/|g" "$file"
    sed -i "s|fetch('http://localhost:5000/api/|fetch('/api/|g" "$file"
    sed -i "s|fetch(\"http://localhost:5000/api/|fetch('/api/|g" "$file"
    sed -i "s|http://localhost:5000/uploads|/uploads|g" "$file"
    sed -i "s|http://localhost:5000/api/download|/api/download|g" "$file"
  fi
done

# Также исправляем все остальные файлы
find . -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|'http://localhost:5000/api/|'/api/|g" {} \;
find . -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|\"http://localhost:5000/api/|\"/api/|g" {} \;
find . -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|http://localhost:5000/uploads|/uploads|g" {} \;
find . -type f \( -name "*.jsx" -o -name "*.js" \) -exec sed -i "s|http://localhost:5000/api/download|/api/download|g" {} \;

echo ""
echo "✅ Замена завершена"
echo "Осталось localhost:5000:"
grep -r "localhost:5000" . --include="*.jsx" --include="*.js" | wc -l

