// Конфигурация PM2 для управления процессами
module.exports = {
  apps: [
    {
      name: 'mesendger-server',
      script: './server/server.js',
      cwd: '/var/www/mesendger',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: '/var/www/mesendger/logs/server-error.log',
      out_file: '/var/www/mesendger/logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      // Перезапуск при сбое
      min_uptime: '10s',
      max_restarts: 10
    }
  ]
};

