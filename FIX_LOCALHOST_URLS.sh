#!/bin/bash
# Скрипт для замены всех localhost:5000 на правильный API URL

cd /var/www/mesendger/client-react/src

# Функция для замены localhost:5000 на window.location.origin
replace_localhost() {
    local file=$1
    # Заменяем fetch('http://localhost:5000 на fetch(`${window.location.origin}
    sed -i "s|fetch('http://localhost:5000|fetch(\`\${window.location.origin}|g" "$file"
    sed -i "s|fetch(\"http://localhost:5000|fetch(\`\${window.location.origin}|g" "$file"
    # Заменяем 'http://localhost:5000 на `${window.location.origin}
    sed -i "s|'http://localhost:5000|\`\${window.location.origin}|g" "$file"
    sed -i "s|\"http://localhost:5000|\`\${window.location.origin}|g" "$file"
    # Исправляем закрывающие кавычки
    sed -i "s|/api/|/api/\`|g" "$file"
    # Исправляем двойные закрывающие
    sed -i "s|\`\`|\`|g" "$file"
}

# Находим все файлы с localhost:5000 и исправляем
find . -type f -name "*.jsx" -o -name "*.js" | while read file; do
    if grep -q "localhost:5000" "$file"; then
        echo "Исправляю: $file"
        # Создаем резервную копию
        cp "$file" "$file.bak"
        # Заменяем
        replace_localhost "$file"
    fi
done

echo "✅ Замена завершена. Проверьте изменения перед пересборкой."

