const express = require('express');
const router = express.Router();
const db = require('../database');

// Получить список сотрудников (для поиска)
router.get('/users', async (req, res) => {
  try {
    const { q } = req.query;
    let users = await db.getAllUsers(); // [{ username, ... }]
    if (q) {
      const query = q.toLowerCase();
      users = users.filter(u => u.username.toLowerCase().startsWith(query));
    }
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
