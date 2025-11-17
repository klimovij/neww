const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Простой логгер: пишет логи в файл client.log
router.post('/', express.json({limit: '100kb'}), (req, res) => {
  const logEntry = {
    time: new Date().toISOString(),
    body: req.body,
    ip: req.ip
  };
  const logLine = JSON.stringify(logEntry) + '\n';
  const logPath = path.join(__dirname, '../client.log');
  fs.appendFile(logPath, logLine, err => {
    if (err) {
      return res.status(500).json({ error: 'Ошибка записи лога' });
    }
    res.json({ ok: true });
  });
});

module.exports = router;
