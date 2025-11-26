# Прямая проверка на сервере

Выполните эти команды на сервере, чтобы найти проблему:

## 1. Проверка версии файла на сервере

```bash
cd /var/www/mesendger

# Проверить, какой файл используется сервером
pm2 info mesendger-server | grep "script path"

# Проверить, есть ли вкладка "Приложения" в исходном файле
grep -c "Приложения" client-react/src/components/UserWorkTimeDetailsMobile.jsx

# Проверить, есть ли вкладка в собранном файле
grep -c "Приложения" client-react/build/static/js/main.*.js

# Проверить, какая версия логирования в исходном файле
grep -n "Компонент рендерится\|НАЧАЛО КОМПОНЕНТА" client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -5

# Проверить, есть ли вкладка Приложения между вкладками Сайты и Скриншоты
grep -A 5 -B 5 "Сайты.*localUrls" client-react/src/components/UserWorkTimeDetailsMobile.jsx | grep -A 10 "Приложения"
```

## 2. Проверка, что файл скопирован правильно

```bash
# Сравнить исходный файл с тем, что в git
cd /var/www/mesendger
diff client-react/src/components/UserWorkTimeDetailsMobile.jsx mesendger/telegram-clone/client-react/src/components/UserWorkTimeDetailsMobile.jsx | head -20
```

## 3. Проверка build

```bash
# Проверить, когда был собран build
ls -la client-react/build/static/js/main.*.js

# Проверить размер файла (должен быть ~482KB)
ls -lh client-react/build/static/js/main.*.js
```

## 4. Проверка, что nginx отдает правильный build

```bash
# Проверить конфигурацию nginx
grep -A 10 "root\|alias" /etc/nginx/sites-enabled/* | grep -A 5 "mesendger\|client-react"

# Проверить, какой build отдает nginx
curl -s http://localhost/build/static/js/main.*.js | head -5
```

