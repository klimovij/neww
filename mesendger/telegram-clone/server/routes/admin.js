const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Middleware для проверки, что пользователь - админ
const requireAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Требуется авторизация' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = require('../database');
    const user = await db.getUserById(decoded.userId || decoded.id);
    
    if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
      return res.status(403).json({ success: false, error: 'Требуются права администратора' });
    }
    
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Неверный токен' });
  }
};

// Эндпоинт для обновления кода с GitHub
router.post('/update-server', requireAdmin, async (req, res) => {
  console.log('🔄 [ADMIN] Запрос на обновление сервера от:', req.user.username);
  
  res.json({ 
    success: true, 
    message: 'Обновление запущено. Это может занять 2-3 минуты.',
    started: new Date().toISOString()
  });
  
  // Запускаем обновление в фоне (не блокируем ответ)
  exec(`
    cd /tmp && 
    rm -rf mesendger-god && 
    git clone https://github.com/klimovij/neww.git mesendger-god && 
    rsync -av --exclude 'node_modules' --exclude '.git' --exclude 'build' --exclude '*.log' --exclude '*.db*' mesendger-god/mesendger/telegram-clone/ /var/www/mesendger/ && 
    chown -R appuser:appuser /var/www/mesendger && 
    cd /var/www/mesendger/server && 
    sudo -u appuser npm install --production && 
    cd /var/www/mesendger/client-react && 
    sudo -u appuser npm install && 
    sudo -u appuser CI=false npm run build && 
    sudo -u appuser pm2 restart all
  `, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ [ADMIN] Ошибка обновления сервера:', error);
      console.error('stderr:', stderr);
    } else {
      console.log('✅ [ADMIN] Сервер успешно обновлен');
      console.log('stdout:', stdout);
    }
  });
});

// Эндпоинт для проверки статуса обновления
router.get('/update-status', requireAdmin, async (req, res) => {
  try {
    const updateScriptPath = '/var/www/mesendger/server/routes/quickCsvReport.js';
    const fs = require('fs');
    
    if (!fs.existsSync(updateScriptPath)) {
      return res.json({ 
        success: false, 
        updated: false, 
        message: 'Файл не найден на сервере' 
      });
    }
    
    const fileContent = fs.readFileSync(updateScriptPath, 'utf8');
    const isUpdated = fileContent.includes('getRemoteWorkTimeLogs') && 
                      fileContent.includes('remoteLogs');
    
    res.json({ 
      success: true, 
      updated: isUpdated,
      message: isUpdated ? 'Сервер обновлен' : 'Сервер не обновлен'
    });
  } catch (err) {
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

module.exports = router;

