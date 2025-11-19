#!/bin/bash
# Массовая замена localhost:5000 на правильный API URL

cd /var/www/mesendger/client-react/src

echo "🔧 Исправление всех localhost:5000 на правильный API URL..."

# Создаем функцию для получения API URL
cat > /tmp/fix_api_url.js << 'EOF'
const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Заменяем различные варианты localhost:5000
    content = content.replace(/fetch\(['"]http:\/\/localhost:5000/g, 'fetch(`${window.location.origin}');
    content = content.replace(/['"]http:\/\/localhost:5000\/api\//g, '`${window.location.origin}/api/');
    content = content.replace(/['"]http:\/\/localhost:5000\//g, '`${window.location.origin}/');
    content = content.replace(/http:\/\/localhost:5000/g, '${window.location.origin}');
    
    // Исправляем закрывающие кавычки для fetch
    content = content.replace(/fetch\(`\$\{window\.location\.origin\}\/api\/([^'"]+)['"]/g, 'fetch(`${window.location.origin}/api/$1`');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        return true;
    }
    return false;
}

// Находим все JSX и JS файлы
const glob = require('glob');
const files = glob.sync('**/*.{js,jsx}', { cwd: process.cwd() });

let fixed = 0;
files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (fixFile(fullPath)) {
        console.log(`Исправлен: ${file}`);
        fixed++;
    }
});

console.log(`Исправлено файлов: ${fixed}`);
EOF

# Простой вариант через sed
find . -type f \( -name "*.jsx" -o -name "*.js" \) -exec grep -l "localhost:5000" {} \; | while read file; do
    echo "Исправляю: $file"
    # Создаем резервную копию
    cp "$file" "$file.bak"
    # Заменяем fetch('http://localhost:5000 на fetch(`${window.location.origin}
    sed -i "s|fetch('http://localhost:5000|fetch(\`\${window.location.origin}|g" "$file"
    sed -i "s|fetch(\"http://localhost:5000|fetch(\`\${window.location.origin}|g" "$file"
    # Заменяем 'http://localhost:5000/api/ на `${window.location.origin}/api/
    sed -i "s|'http://localhost:5000/api/|\`\${window.location.origin}/api/|g" "$file"
    sed -i "s|\"http://localhost:5000/api/|\`\${window.location.origin}/api/|g" "$file"
    # Заменяем 'http://localhost:5000/ на `${window.location.origin}/
    sed -i "s|'http://localhost:5000/|\`\${window.location.origin}/|g" "$file"
    sed -i "s|\"http://localhost:5000/|\`\${window.location.origin}/|g" "$file"
    # Исправляем закрывающие кавычки - заменяем ' на ` в конце fetch
    sed -i "s|/api/\([^'"]*\)'|/api/\1\`|g" "$file"
    sed -i "s|/api/\([^\"]*\)\"|/api/\1\`|g" "$file"
done

echo "✅ Замена завершена"

