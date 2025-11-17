var sqlite3 = require('sqlite3').verbose();
var bcrypt = require('bcrypt');

class Database {
  // Публичный метод для комментария к поздравлению
  async addCongratulationComment({ congratId, userId, commentText }) {
    return this.addComment({ congratId, userId, commentText });
  }

  // ==================== ШАБЛОНЫ СООБЩЕНИЙ ПО ДЕПАРТАМЕНТАМ ====================
  async getTemplatesByDepartment(department) {
    return new Promise((resolve, reject) => {
      // SOS шаблоны видны всем пользователям, департаментские - только своему департаменту
      const sql = 'SELECT id, department, title, content, type, active, created_at FROM quick_templates WHERE (type = "sos" OR (department = ? AND department != "")) AND COALESCE(active,1)=1 ORDER BY type DESC, id DESC';
      console.log('🔍 getTemplatesByDepartment SQL:', sql);
      console.log('🔍 getTemplatesByDepartment params:', [department || '']);
      
      this.db.all(sql, [department || ''], (err, rows) => {
        if (err) {
          console.error('❌ getTemplatesByDepartment error:', err);
          reject(err);
        } else {
          console.log('✅ getTemplatesByDepartment result:', rows?.length || 0, 'templates found');
          console.log('📋 Templates:', rows?.map(r => ({ id: r.id, type: r.type, department: r.department, title: r.title })));
          resolve(rows || []);
        }
      });
    });
  }
  async getAllTemplates() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, department, title, content, type, active, created_at FROM quick_templates ORDER BY department, type, id DESC', (err, rows) => err ? reject(err) : resolve(rows || []));
    });
  }
  async createTemplate({ department, title, content, type = 'info', active = 1 }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO quick_templates (department, title, content, type, active, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [department || '', title || '', content || '', type || 'info', Number(active) ? 1 : 0],
        function(err) { if (err) reject(err); else resolve(this.lastID); }
      );
    });
  }
  async updateTemplate(id, { department, title, content, type, active }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE quick_templates SET department = COALESCE(?, department), title = COALESCE(?, title), content = COALESCE(?, content), type = COALESCE(?, type), active = COALESCE(?, active) WHERE id = ?',
        [department ?? null, title ?? null, content ?? null, type ?? null, (active===undefined? null : (Number(active)?1:0)), id],
        function(err) { if (err) reject(err); else resolve(this.changes); }
      );
    });
  }
  async deleteTemplate(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM quick_templates WHERE id = ?', [id], function(err){ if (err) reject(err); else resolve(this.changes); });
    });
  }

  // Установить/обновить департамент пользователя
  async setUserDepartment(userId, department) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET department = ? WHERE id = ?',
        [department || null, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Лайкнуть новость
  async likeNews(newsId, userId, emoji = null) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT 1 FROM news_likes WHERE news_id = ? AND user_id = ?', [newsId, userId], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(false); // Уже лайкал
        this.db.run('INSERT INTO news_likes (news_id, user_id, emoji) VALUES (?, ?, ?)', [newsId, userId, emoji], (err2) => {
          if (err2) return reject(err2);
          else resolve(true);
        });
      });
    });
  }

  // Удалить лайк с новости
  async unlikeNews(newsId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM news_likes WHERE news_id = ? AND user_id = ?', [newsId, userId], (err) => {
        if (err) return reject(err);
        else resolve(true);
      });
    });
  }
  // Обновить poll-сообщение (варианты, голоса, проголосовавшие)
  async updatePoll(messageId, pollOptions, pollVotes, pollVoters) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE messages SET poll_options = ?, poll_votes = ?, poll_voters = ? WHERE id = ?',
        [pollOptions, pollVotes, pollVoters, messageId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }
  constructor() {
    this.db = new sqlite3.Database('./messenger.db');
    this.db.configure('busyTimeout', 30000); // ожидание до 30 секунд
    this.init();

    // Миграция: добавить поля poll_votes и poll_voters для поддержки опросов (отключено для избежания блокировки БД)
    // setTimeout(() => {
    //   this.db.run(`ALTER TABLE messages ADD COLUMN poll_options TEXT`, () => {});
    //   this.db.run(`ALTER TABLE messages ADD COLUMN poll_votes TEXT`, () => {});
    //   this.db.run(`ALTER TABLE messages ADD COLUMN poll_voters TEXT`, () => {});
    // }, 1000);
  }

  // Установить/обновить роль пользователя
  async setUserRole(userId, role) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET role = ? WHERE id = ?',
        [role, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ОПРОСАМИ ====================

  // Создать опрос (poll) для новостей
  async createPoll({ question, options, authorId }) {
    return new Promise((resolve, reject) => {
      const safePublishAt = new Date().toISOString();
      const votes = Array.isArray(options) ? Array(options.length).fill(0) : [];
      const voters = [];
      
      this.db.run(
        'INSERT INTO news (title, content, authorId, publishAt, type, question, options, votes, voters) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          '[Опрос]', // title
          question,  // content
          authorId,
          safePublishAt,
          'poll',
          question,
          JSON.stringify(options || []),
          JSON.stringify(votes),
          JSON.stringify(voters)
        ],
        function(err) {
          if (err) reject(err);
          else {
            const newsId = this.lastID;
            resolve({
              id: newsId,
              title: '[Опрос]',
              content: question,
              authorId,
              publishAt: safePublishAt,
              type: 'poll',
              question,
              options: options || [],
              votes,
              voters
            });
          }
        }
      );
    });
  }

  // Обновить голоса и список проголосовавших для новости-опроса
  async updateNewsPoll(newsId, votes, voters) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE news SET votes = ?, voters = ? WHERE id = ?',
        [JSON.stringify(votes), JSON.stringify(voters), newsId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Очистить старые некорректные записи в поле voters (оставить только объекты с userId и optionIndex)
  async fixOldPollVoters() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT id, voters FROM news WHERE type = "poll"', [], async (err, rows) => {
        if (err) return reject(err);
        let fixed = 0;
        for (const row of rows) {
          let voters;
          try { 
            voters = row.voters ? JSON.parse(row.voters) : []; 
          } catch { 
            voters = []; 
          }
          
          // Если массив содержит не объекты, а числа (старый формат)
          if (Array.isArray(voters) && voters.length > 0 && typeof voters[0] === 'number') {
            // Очищаем поле voters
            await new Promise((res, rej) => {
              this.db.run('UPDATE news SET voters = ? WHERE id = ?', [JSON.stringify([]), row.id], function(e) {
                if (e) rej(e); else res();
              });
            });
            fixed++;
          }
        }
        resolve(fixed);
      });
    });
  }

  // Получить новость по ID
  async getNewsById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM news WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С НОВОСТЯМИ ====================

  async getAllNews(role, userId) {
    // Расширяем: если новость — поздравление, добавляем данные о лайках и комментариях
    return new Promise((resolve, reject) => {
      const query = 'SELECT n.*, u.username as authorUsername, u.avatar as authorAvatar FROM news n LEFT JOIN users u ON n.authorId = u.id ORDER BY n.publishAt DESC';
      this.db.all(query, [], async (err, rows) => {
        if (err) return reject(err);
        
        const now = new Date();
        let filtered = rows || [];
        
        if (!(role === 'hr' || role === 'admin')) {
          filtered = (rows || []).filter(item => {
            if (!item.publishAt) return true;
            const pubDate = new Date(item.publishAt);
            return pubDate <= now;
          });
        }
        
        // Для каждой новости ищем, является ли она поздравлением (по title и content)
        const result = await Promise.all((filtered || []).map(async news => {
          // Проверка на существование news
          if (!news) return null;
          // Декодируем HTML-сущности в контенте, если они экранированы
          if (news && typeof news.content === 'string') {
            try {
              let prev = news.content;
              let next = news.content;
              // до 3 проходов, чтобы снять двойное экранирование
              for (let i = 0; i < 3; i++) {
                next = next
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .replace(/&quot;/g, '"')
                  .replace(/&#39;/g, "'")
                  .replace(/&amp;/g, '&');
                if (next === prev) break;
                prev = next;
              }
              news.content = next;
            } catch {}
          }
          
          // Поздравление
          if (news.title && news.title.startsWith('Поздравление')) {
            const congrat = await new Promise((resolveC) => {
              this.db.get('SELECT * FROM congratulations WHERE congrat_text = ?', [news.content], (err2, row2) => {
                if (err2) resolveC(null);
                else resolveC(row2);
              });
            });
            
            let likedByUser = false;
            if (userId && congrat) {
              likedByUser = await new Promise((resolveLike) => {
                this.db.get('SELECT 1 FROM congrat_likes WHERE congrat_id = ? AND user_id = ?', [congrat.id, userId], (err4, row4) => {
                  resolveLike(!!row4);
                });
              });
            }
            
            if (congrat) {
              const comments = await new Promise((resolveCmts) => {
                this.db.all(`
                  SELECT cc.comment_text, u.username, u.avatar
                  FROM congrat_comments cc
                  LEFT JOIN users u ON cc.user_id = u.id
                  WHERE cc.congrat_id = ?
                  ORDER BY cc.id ASC
                `, [congrat.id], (err3, rows3) => {
                  if (err3) resolveCmts([]);
                  else resolveCmts((rows3 || []).map(r => ({
                    text: r.comment_text,
                    commentText: r.comment_text,
                    username: r.username || 'Пользователь',
                    avatar: r.avatar || null
                  })));
                });
              });
              
              return {
                ...news,
                congratulationId: congrat.id,
                likes: congrat.likes || 0,
                comments: Array.isArray(comments) ? comments : [],
                likedByUser,
                file_url: congrat.file_url || null,
              };
            }
          }
          
          // Обычная новость или опрос: комментарии, лайки, голоса
          const newsComments = await new Promise((resolveCmts) => {
            this.db.all(`
              SELECT nc.comment_text, u.username, u.avatar
              FROM news_comments nc
              LEFT JOIN users u ON nc.user_id = u.id
              WHERE nc.news_id = ?
              ORDER BY nc.id ASC
            `, [news.id], (err3, rows3) => {
              if (err3) resolveCmts([]);
              else {
                resolveCmts((rows3 || []).map(r => ({
                  text: r.comment_text,
                  commentText: r.comment_text,
                  username: r.username || 'Пользователь',
                  avatar: r.avatar || null
                })));
              }
            });
          });
          
          const newsLikes = await new Promise((resolveLikes) => {
            this.db.all(`
              SELECT emoji, COUNT(*) as count, user_id
              FROM news_likes
              WHERE news_id = ?
              GROUP BY emoji, user_id
            `, [news.id], (err4, rows4) => {
              if (err4) resolveLikes([]);
              else resolveLikes(rows4 || []);
            });
          });
          
          let likedByUser = false;
          if (userId) {
            likedByUser = (newsLikes || []).some(like => like.user_id == userId);
          }
          
          // Для опроса парсим options, votes и voters
          let options = [], votes = [], voters = [];
          if (news.type === 'poll') {
            try { 
              options = news.options ? JSON.parse(news.options) : []; 
            } catch { 
              options = []; 
            }
            
            try { 
              votes = news.votes ? JSON.parse(news.votes) : []; 
            } catch { 
              votes = []; 
            }
            
            try { 
              voters = news.voters ? JSON.parse(news.voters) : []; 
            } catch { 
              voters = []; 
            }
          }
          
          return {
            ...news,
            newsId: news.id,
            newsComments: Array.isArray(newsComments) ? newsComments : [],
            newsLikes: Array.isArray(newsLikes) ? newsLikes : [],
            likedByUser,
            ...(news.type === 'poll' ? { 
              options: Array.isArray(options) ? options : [],
              votes: Array.isArray(votes) ? votes : [],
              voters: Array.isArray(voters) ? voters : []
            } : {})
          };
        }));
        
        // Фильтруем null значения
        resolve((result || []).filter(item => item !== null));
      });
    });
  }

  async createNews({ title, content, authorId, publishAt }) {
    return new Promise((resolve, reject) => {
      const safePublishAt = publishAt || new Date().toISOString();
      // Если есть congratulationId, добавляем его в таблицу news
      let query = 'INSERT INTO news (title, content, authorId, publishAt';
      let params = [title, content, authorId, safePublishAt];
      if (arguments[0].congratulationId) {
        query += ', congratulationId';
        params.push(arguments[0].congratulationId);
      }
      query += ') VALUES (' + params.map(() => '?').join(', ') + ')';
      this.db.run(
        query,
        params,
        function(err) {
          if (err) return reject(err);
          const newsId = this.lastID;
          // Получаем только что добавленную новость
          this.db.get('SELECT * FROM news WHERE id = ?', [newsId], (err2, row) => {
            if (err2) return reject(err2);
            resolve(row);
          });
        }.bind(this)
      );
    });
  }

  deleteNews(id, callback) {
    // Сначала удаляем все комментарии и лайки, связанные с новостью
    this.db.run('DELETE FROM news_comments WHERE news_id = ?', [id], (err1) => {
      if (err1) return callback(err1);
      this.db.run('DELETE FROM news_likes WHERE news_id = ?', [id], (err2) => {
        if (err2) return callback(err2);
        this.db.run('DELETE FROM news WHERE id = ?', [id], callback);
      });
    });
  }

  // Async версия deleteNews
  async deleteNewsAsync(id) {
    return new Promise((resolve, reject) => {
      // Сначала удаляем все комментарии и лайки, связанные с новостью
      this.db.run('DELETE FROM news_comments WHERE news_id = ?', [id], (err1) => {
        if (err1) return reject(err1);
        this.db.run('DELETE FROM news_likes WHERE news_id = ?', [id], (err2) => {
          if (err2) return reject(err2);
          this.db.run('DELETE FROM news WHERE id = ?', [id], function(err3) {
            if (err3) return reject(err3);
          });
        });
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЛАЙКАМИ ====================

  // Лайкнуть новость (можно повторно, не ошибка)
  async likeNews(newsId, userId, emoji) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT 1 FROM news_likes WHERE news_id = ? AND user_id = ?', [newsId, userId], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(true); // Уже лайкал — не ошибка
        // emoji может быть null
        this.db.run('INSERT INTO news_likes (news_id, user_id, emoji) VALUES (?, ?, ?)', [newsId, userId, emoji || null], (err2) => {
          if (err2) return reject(err2);
          resolve(true);
        });
      });
    });
  }

  // Удалить лайк с новости
  async unlikeNews(newsId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM news_likes WHERE news_id = ? AND user_id = ?', [newsId, userId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  // Лайкнуть поздравление (только один раз на пользователя)
  async likeCongratulation(congratId, userId) {
    return new Promise((resolve, reject) => {
      // Проверяем, ставил ли уже пользователь лайк
      this.db.get('SELECT 1 FROM congrat_likes WHERE congrat_id = ? AND user_id = ?', [congratId, userId], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(false); // Уже лайкал
        // Добавляем лайк
        this.db.run('INSERT INTO congrat_likes (congrat_id, user_id) VALUES (?, ?)', [congratId, userId], (err2) => {
          if (err2) return reject(err2);
          // Увеличиваем счётчик лайков
          this.db.run('UPDATE congratulations SET likes = likes + 1 WHERE id = ?', [congratId], function(err3) {
            if (err3) reject(err3);
            else resolve(true);
          });
        });
      });
    });
  }

  // Переключить лайк поздравления (toggle) с логированием
  async toggleLikeCongratulation(congratId, userId) {
    console.log(`toggleLikeCongratulation called with congratId=${congratId}, userId=${userId}`);
    return new Promise((resolve, reject) => {
      this.db.get('SELECT 1 FROM congrat_likes WHERE congrat_id = ? AND user_id = ?', [congratId, userId], (err, row) => {
        if (err) {
          console.error('DB error in toggleLikeCongratulation SELECT:', err);
          return reject(err);
        }
        if (row) {
          console.log('Like exists, removing like');
          // Если лайк уже есть, удаляем
          this.db.run('DELETE FROM congrat_likes WHERE congrat_id = ? AND user_id = ?', [congratId, userId], (err2) => {
            if (err2) {
              console.error('DB error in toggleLikeCongratulation DELETE:', err2);
              return reject(err2);
            }
            this.db.run('UPDATE congratulations SET likes = likes - 1 WHERE id = ? AND likes > 0', [congratId], function(err3) {
              if (err3) {
                console.error('DB error in toggleLikeCongratulation UPDATE:', err3);
                reject(err3);
              } else {
                console.log('Like removed successfully');
                resolve(false); // Лайк убран
              }
            });
          });
        } else {
          console.log('Like does not exist, adding like');
          // Если лайка нет, добавляем
          this.db.run('INSERT INTO congrat_likes (congrat_id, user_id) VALUES (?, ?)', [congratId, userId], (err2) => {
            if (err2) {
              console.error('DB error in toggleLikeCongratulation INSERT:', err2);
              return reject(err2);
            }
            this.db.run('UPDATE congratulations SET likes = likes + 1 WHERE id = ?', [congratId], function(err3) {
              if (err3) {
                console.error('DB error in toggleLikeCongratulation UPDATE:', err3);
                reject(err3);
              } else {
                console.log('Like added successfully');
                resolve(true); // Лайк поставлен
              }
            });
          });
        }
      });
    });
  }

  // Удалить лайк с поздравления
  async unlikeCongratulation(congratId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM congrat_likes WHERE congrat_id = ? AND user_id = ?', [congratId, userId], (err) => {
        if (err) return reject(err);
        // Уменьшаем счетчик лайков
        this.db.run('UPDATE congratulations SET likes = likes - 1 WHERE id = ? AND likes > 0', [congratId], function(err2) {
          if (err2) reject(err2);
          else resolve(true);
        });
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С КОММЕНТАРИЯМИ ====================

  // Добавить комментарий к новости
  async addNewsComment({ newsId, userId, commentText }) {
    console.log('[DB] Сохраняем комментарий:', { newsId, userId, commentText });
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO news_comments (news_id, user_id, comment_text) VALUES (?, ?, ?)',
        [newsId, userId, commentText],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Добавить комментарий к поздравлению
  async addComment({ congratId, userId, commentText }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO congrat_comments (congrat_id, user_id, comment_text) VALUES (?, ?, ?)',
        [congratId, userId, commentText],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ ====================

  async createUser(username, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO users (username, password) VALUES (?, ?)',
        [username, hashedPassword],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserById(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT id, username, avatar, role, department FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getUserByToken(token) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE token = ?', [token], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getAllUsers() {
    return new Promise((resolve, reject) => {
      // Возвращаем пользователей без изменения last_seen
      this.db.all(
        'SELECT id, username, avatar, online, role, employee_id, last_seen, department FROM users ORDER BY username',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async updateUserOnlineStatus(userId, online) {
    return new Promise((resolve, reject) => {
      if (online) {
        // При подключении обновляем и статус, и время последней активности
        this.db.run(
          'UPDATE users SET online = ?, last_seen = datetime("now", "localtime") WHERE id = ?',
          [online, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      } else {
        // При отключении обновляем статус и устанавливаем last_seen на текущее время
        // (время когда пользователь действительно отключился)
        this.db.run(
          'UPDATE users SET online = ?, last_seen = datetime("now", "localtime") WHERE id = ?',
          [online, userId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      }
    });
  }

  async getOnlineUsers() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT id, username, avatar, last_seen FROM users WHERE online = 1',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Сбросить онлайн-статус для всех пользователей при старте сервера
  async resetAllUsersOffline() {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE users SET online = 0', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Временная функция для исправления времени last_seen для всех пользователей
  async fixLastSeenForAllUsers() {
    return new Promise((resolve, reject) => {
      // Обновляем время last_seen для ВСЕХ пользователей (и онлайн, и офлайн)
      this.db.run(
        'UPDATE users SET last_seen = CURRENT_TIMESTAMP',
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // Пересчет last_seen офлайн-пользователей на основе последних событий работы (RDP) из work_time_logs
  async recalculateLastSeenFromWorkLogs() {
    return new Promise((resolve, reject) => {
      // Берем для каждого пользователя по его username максимальный event_time из work_time_logs
      const sql = `
        WITH last_events AS (
          SELECT u.id as user_id,
                 MAX(
                   CASE 
                     WHEN length(w.event_time) >= 10 AND substr(w.event_time, 3, 1) = '.' AND substr(w.event_time, 6, 1) = '.'
                       THEN substr(w.event_time, 7, 4) || '-' || substr(w.event_time, 4, 2) || '-' || substr(w.event_time, 1, 2) ||
                            CASE WHEN length(w.event_time) > 10 THEN ' ' || substr(w.event_time, 12) ELSE '' END
                     ELSE substr(w.event_time, 1, 19)
                   END
                 ) as last_time
          FROM users u
          LEFT JOIN work_time_logs w ON w.username = u.username
          GROUP BY u.id
        )
        UPDATE users
        SET last_seen = (SELECT last_time FROM last_events le WHERE le.user_id = users.id)
        WHERE online = 0
          AND (SELECT last_time FROM last_events le WHERE le.user_id = users.id) IS NOT NULL
          AND (SELECT last_time FROM last_events le WHERE le.user_id = users.id) > COALESCE(users.last_seen, '0000-00-00 00:00:00')
      `;
      this.db.run(sql, (err) => {
        if (err) return reject(err);
        // Возвращаем количество измененных строк
        this.db.get('SELECT changes() AS changes', (e, row) => {
          if (e) return reject(e);
          resolve(row?.changes || 0);
        });
      });
    });
  }

  // Установить/обновить ссылку на аватар пользователя
  async setUserAvatar(userId, avatarUrl) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET avatar = ? WHERE id = ?',
        [avatarUrl, userId],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async setUserToken(userId, token) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE users SET token = ? WHERE id = ?',
        [token, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЧАТАМИ ====================

  async createChat(name, type, createdBy) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO chats (name, type, created_by) VALUES (?, ?, ?)',
        [name, type, createdBy],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async addUserToChat(chatId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO chat_participants (chat_id, user_id) VALUES (?, ?)',
        [chatId, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async getUserChats(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT 
          c.*,
          u.username as created_by_username,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.chat_id = c.id
            AND m.user_id != ?
            AND m.id NOT IN (
              SELECT mr.message_id
              FROM message_reads mr
              WHERE mr.user_id = ?
            )
          ) as unread_count,
          (
            SELECT m.content
            FROM messages m
            WHERE m.chat_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message,
          (
            SELECT m.created_at
            FROM messages m
            WHERE m.chat_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
          ) as last_message_time
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chat_id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE cp.user_id = ?
        ORDER BY last_message_time DESC, c.created_at DESC
      `, [userId, userId, userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getPrivateChat(userId1, userId2) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT c.* FROM chats c
        JOIN chat_participants cp1 ON c.id = cp1.chat_id
        JOIN chat_participants cp2 ON c.id = cp2.chat_id
        WHERE c.type = 'private'
        AND cp1.user_id = ?
        AND cp2.user_id = ?
        AND (
          SELECT COUNT(*) FROM chat_participants cp3 WHERE cp3.chat_id = c.id
        ) = 2
      `, [userId1, userId2], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async isUserInChat(chatId, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT 1 FROM chat_participants WHERE chat_id = ? AND user_id = ?',
        [chatId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  async getChatParticipants(chatId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT user_id FROM chat_participants WHERE chat_id = ?',
        [chatId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getChatParticipantsWithDetails(chatId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT u.id, u.username, u.avatar, u.online, cp.joined_at,
               e.department
        FROM chat_participants cp
        JOIN users u ON cp.user_id = u.id
        LEFT JOIN employees e ON e.id = u.employee_id
        WHERE cp.chat_id = ?
        ORDER BY u.username
      `, [chatId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ==================== НОВЫЕ МЕТОДЫ ДЛЯ УДАЛЕНИЯ ЧАТОВ ====================

  async getChatById(chatId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM chats WHERE id = ?',
        [chatId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async deleteChat(chatId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Удаляем все лайки сообщений чата
        this.db.run(`
          DELETE FROM message_likes 
          WHERE message_id IN (
            SELECT id FROM messages WHERE chat_id = ?
          )
        `, [chatId], (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
        });
        
        // Удаляем все записи о прочитанности сообщений чата
        this.db.run(`
          DELETE FROM message_reads 
          WHERE message_id IN (
            SELECT id FROM messages WHERE chat_id = ?
          )
        `, [chatId], (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
        });
        
        // Удаляем все сообщения чата
        this.db.run('DELETE FROM messages WHERE chat_id = ?', [chatId], (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
        });
        
        // Удаляем всех участников чата
        this.db.run('DELETE FROM chat_participants WHERE chat_id = ?', [chatId], (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          }
        });
        
        // Удаляем сам чат
        this.db.run('DELETE FROM chats WHERE id = ?', [chatId], (err) => {
          if (err) {
            this.db.run('ROLLBACK');
            return reject(err);
          } else {
            this.db.run('COMMIT', (commitErr) => {
              if (commitErr) {
                return reject(commitErr);
              }
              // Получаем количество изменений через get, так как this.changes недоступен
              this.db.get('SELECT changes() AS changes', (getErr, row) => {
                if (getErr) {
                  return reject(getErr);
                }
                console.log(`✅ Chat ${chatId} deleted successfully with ${row.changes} changes`);
                resolve(row.changes);
              });
            });
          }
        });
      });
    });
  }

  async removeUserFromChat(chatId, userId) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 removeUserFromChat called: chatId=${chatId}, userId=${userId}`);
      
      // Сначала проверяем тип чата
      this.db.get('SELECT type FROM chats WHERE id = ?', [chatId], (err, chat) => {
        if (err) {
          console.error(`❌ Error getting chat type for ${chatId}:`, err);
          reject(err);
          return;
        }
        
        console.log(`🔍 Chat ${chatId} type:`, chat?.type);
        
        if (chat && chat.type === 'private') {
          console.log(`🗑️ Deleting private chat ${chatId} completely...`);
          // Для приватных чатов полностью удаляем чат
          this.deleteChat(chatId)
            .then(() => {
              console.log(`✅ Private chat ${chatId} deleted completely from database`);
              resolve();
            })
            .catch((error) => {
              console.error(`❌ Error deleting private chat ${chatId}:`, error);
              reject(error);
            });
        } else {
          console.log(`👥 Removing user ${userId} from group chat ${chatId}...`);
          // Для групповых чатов просто удаляем участника
          this.db.run(
            'DELETE FROM chat_participants WHERE chat_id = ? AND user_id = ?',
            [chatId, userId],
            function(err) {
              if (err) {
                console.error(`❌ Error removing user from chat:`, err);
                reject(err);
              } else {
                console.log(`✅ User ${userId} removed from chat ${chatId}`);
                resolve();
              }
            }
          );
        }
      });
    });
  }

  async getChatWithParticipants(chatId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          c.*,
          u.username as created_by_username,
          (
            SELECT COUNT(*) 
            FROM chat_participants cp 
            WHERE cp.chat_id = c.id
          ) as participants_count
        FROM chats c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = ?
      `, [chatId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async softDeleteChat(chatId, userId) {
    // Для приватных чатов - просто удаляем пользователя из участников
    // Чат остается для другого участника
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Проверяем тип чата
        this.db.get('SELECT type FROM chats WHERE id = ?', [chatId], (err, chat) => {
          if (err) return reject(err);
          
          if (chat && chat.type === 'private') {
            // Для приватного чата просто удаляем участника
            this.removeUserFromChat(chatId, userId)
              .then(resolve)
              .catch(reject);
          } else {
            // Для группового чата удаляем полностью
            this.deleteChat(chatId)
              .then(resolve)
              .catch(reject);
          }
        });
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С СОБЫТИЯМИ ====================

  async createMessage(chatId, userId, content, messageType = 'text', fileInfo = null, replyToId = null, templateType = null, customTimestamp = null) {
    return new Promise((resolve, reject) => {
      let sql, params;
      
      if (customTimestamp) {
        // Если передано кастомное время, используем его
        sql = 'INSERT INTO messages (chat_id, user_id, content, message_type, file_info, reply_to_id, template_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
        params = [chatId, userId, content, messageType, fileInfo, replyToId, templateType, customTimestamp];
      } else {
        // Иначе используем CURRENT_TIMESTAMP по умолчанию
        sql = 'INSERT INTO messages (chat_id, user_id, content, message_type, file_info, reply_to_id, template_type) VALUES (?, ?, ?, ?, ?, ?, ?)';
        params = [chatId, userId, content, messageType, fileInfo, replyToId, templateType];
      }
      
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async getChatMessages(chatId, limit = 50) {
    return this.getChatMessagesWithLikes(chatId, null, limit);
  }

  async getChatMessagesWithLikes(chatId, userId = null, limit = 50) {
    return new Promise((resolve, reject) => {
      const userIdParam = userId || 0;
      this.db.all(`
        SELECT 
          m.*,
          u.username,
          (SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id AND ml.user_id = ?) as user_liked
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.chat_id = ?
        ORDER BY m.created_at DESC
        LIMIT ?
      `, [userIdParam, chatId, limit], async (err, rows) => {
        if (err) return reject(err);
        // Для каждого сообщения получить лайки и reply_to_message
        const withLikes = await Promise.all((rows || []).reverse().map(async msg => {
          const likes = await this.getMessageLikes(msg.id);
          let reply_to_message = null;
          if (msg.reply_to_id) {
            // Получаем полный объект сообщения-ответа
            reply_to_message = await new Promise((resolveReply) => {
              this.db.get(`
                SELECT m.id, m.content, m.message_type, u.username, u.avatar
                FROM messages m
                JOIN users u ON m.user_id = u.id
                WHERE m.id = ?
              `, [msg.reply_to_id], (err2, row2) => {
                if (err2 || !row2) {
                  resolveReply({
                    id: msg.reply_to_id,
                    content: 'Сообщение удалено',
                    username: '',
                    avatar: '',
                    message_type: 'text',
                  });
                } else {
                  resolveReply(row2);
                }
              });
            });
          }
          // Для poll-сообщения парсим pollOptions, pollVotes, pollVoters
          let pollOptions = [], pollVotes = {}, pollVoters = [];
          if (msg.message_type === 'poll') {
            try { 
              pollOptions = msg.poll_options ? JSON.parse(msg.poll_options) : []; 
            } catch { 
              pollOptions = []; 
            }
            
            try { 
              pollVotes = msg.poll_votes ? JSON.parse(msg.poll_votes) : {}; 
            } catch { 
              pollVotes = {}; 
            }
            
            try { 
              pollVoters = msg.poll_voters ? JSON.parse(msg.poll_voters) : []; 
            } catch { 
              pollVoters = []; 
            }
          }
          
          return {
            ...msg,
            likes: Array.isArray(likes) ? likes : [],
            reply_to_message,
            ...(msg.message_type === 'poll' ? { 
              pollOptions: Array.isArray(pollOptions) ? pollOptions : [],
              pollVotes: pollVotes || {},
              pollVoters: Array.isArray(pollVoters) ? pollVoters : []
            } : {})
          };
        }));
        resolve(withLikes);
      });
    });
  }

  async getMessageById(messageId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT m.*, u.username
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `;
      console.log('[DB] getMessageById SQL:', sql.trim(), 'PARAMS:', messageId);
      this.db.get(sql, [messageId], (err, row) => {
        if (err) {
          console.log('[DB] getMessageById ERROR:', err);
          reject(err);
        } else {
          console.log('[DB] getMessageById RESULT:', row);
          resolve(row);
        }
      });
    });
  }

  async deleteMessage(messageId) {
    return new Promise((resolve, reject) => {
    console.log('[DB] deleteMessage: start', { messageId });
      const db = this.db;
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        // Удаляем лайки сообщения
        db.run('DELETE FROM message_likes WHERE message_id = ?', [messageId]);
        // Удаляем записи о прочитанности
        db.run('DELETE FROM message_reads WHERE message_id = ?', [messageId]);
        // Удаляем само сообщение
        db.run('DELETE FROM messages WHERE id = ?', [messageId], function(err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
          } else {
              db.run('COMMIT');
              console.log('[DB] deleteMessage: end', { messageId });
              resolve(true);
          }
        });
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ПРОЧИТАННОСТЬЮ ====================

  async markMessageAsRead(messageId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR IGNORE INTO message_reads (message_id, user_id) VALUES (?, ?)',
        [messageId, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async markChatMessagesAsRead(chatId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR IGNORE INTO message_reads (message_id, user_id)
        SELECT m.id, ?
        FROM messages m
        WHERE m.chat_id = ? AND m.user_id != ?
      `, [userId, chatId, userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЛАЙКАМИ ====================

  async likeMessage(messageId, userId, emoji) {
    return new Promise((resolve, reject) => {
      // Сначала удаляем все лайки пользователя под этим сообщением
      this.db.run(
        'DELETE FROM message_likes WHERE message_id = ? AND user_id = ?',
        [messageId, userId],
        (err) => {
          if (err) return reject(err);
          // Затем добавляем новый лайк
          this.db.run(
            'INSERT OR IGNORE INTO message_likes (message_id, user_id, emoji) VALUES (?, ?, ?)',
            [messageId, userId, emoji],
            function(err2) {
              if (err2) reject(err2);
              else resolve(this.changes > 0);
            }
          );
        }
      );
    });
  }

  async unlikeMessage(messageId, userId, emoji) {
    return new Promise((resolve, reject) => {
      // Удаляем все лайки пользователя под этим сообщением (по любому emoji)
      this.db.run(
        'DELETE FROM message_likes WHERE message_id = ? AND user_id = ?',
        [messageId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  async getMessageLikes(messageId) {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT ml.user_id, u.username, ml.emoji, ml.created_at
        FROM message_likes ml
        JOIN users u ON ml.user_id = u.id
        WHERE ml.message_id = ?
        ORDER BY ml.created_at ASC
      `, [messageId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getMessageLikesCount(messageId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM message_likes WHERE message_id = ?',
        [messageId],
        (err, row) => {
          if (err) reject(err);
          else resolve((row && row.count) || 0);
        }
      );
    });
  }

  async isMessageLikedByUser(messageId, userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT 1 FROM message_likes WHERE message_id = ? AND user_id = ?',
        [messageId, userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С СОТРУДНИКАМИ ====================

  // Получить всех сотрудников
  async getAllEmployees() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM employees', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async addEmployee({ first_name, last_name, birth_day, birth_month, birth_year, avatar_url, department }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO employees (first_name, last_name, birth_day, birth_month, birth_year, avatar_url, department) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [first_name, last_name, birth_day, birth_month, birth_year, avatar_url, department || null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Получить сотрудника по id
  async getEmployeeById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM employees WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Найти сотрудника по имени и фамилии
  async findEmployeeByName(first_name, last_name) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM employees WHERE first_name = ? AND last_name = ?', [first_name, last_name], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Получить пользователя по employee_id
  async getUserByEmployeeId(employee_id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM users WHERE employee_id = ?', [employee_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Создать пользователя с employee_id
  async createUserWithEmployee({ employee_id, password, username }) {
    return new Promise(async (resolve, reject) => {
      try {
        const hash = await require('bcrypt').hash(password, 10);
        this.db.run('INSERT INTO users (employee_id, password, username) VALUES (?, ?, ?)', [employee_id, hash, username], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Редактировать сотрудника
  async editEmployee(id, { first_name, last_name, birth_day, birth_month, birth_year, avatar_url }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE employees SET first_name = ?, last_name = ?, birth_day = ?, birth_month = ?, birth_year = ?, avatar_url = ? WHERE id = ?',
        [first_name, last_name, birth_day, birth_month, birth_year, avatar_url, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Удалить сотрудника
  async removeEmployee(id) {
    return new Promise((resolve, reject) => {
      // Сначала удаляем все поздравления сотрудника
      this.db.run('DELETE FROM congratulations WHERE employee_id = ?', [id], (err1) => {
        if (err1) return reject(err1);
        // Удаляем все новости, где автор — сотрудник
        this.db.run('DELETE FROM news WHERE authorId = ?', [id], (err2) => {
          if (err2) return reject(err2);
          // Удаляем все лайки сотрудника
          this.db.run('DELETE FROM news_likes WHERE user_id = ?', [id], (err3) => {
            if (err3) return reject(err3);
            this.db.run('DELETE FROM congrat_likes WHERE user_id = ?', [id], (err4) => {
              if (err4) return reject(err4);
              // Удаляем самого сотрудника
              this.db.run('DELETE FROM employees WHERE id = ?', [id], function(err5) {
                if (err5) reject(err5);
                else resolve(this.changes);
              });
            });
          });
        });
      });
    });
  }

  // Удалить сотрудника
  async deleteEmployee(id) {
    // Получаем все поздравления сотрудника
    const congratIds = await new Promise((resolve, reject) => {
      this.db.all('SELECT id FROM congratulations WHERE employee_id = ?', [id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.id));
      });
    });

    // Удаляем комментарии и лайки для каждого поздравления
    for (const congratId of congratIds) {
      await new Promise((resolve, reject) => {
        this.db.run('DELETE FROM congrat_comments WHERE congrat_id = ?', [congratId], function(err) {
          if (err) reject(err); else resolve();
        });
      });
      await new Promise((resolve, reject) => {
        this.db.run('DELETE FROM congrat_likes WHERE congrat_id = ?', [congratId], function(err) {
          if (err) reject(err); else resolve();
        });
      });
    }

    // Удаляем поздравления сотрудника
    await new Promise((resolve, reject) => {
      this.db.run('DELETE FROM congratulations WHERE employee_id = ?', [id], function(err) {
        if (err) reject(err); else resolve();
      });
    });

    // Если существует пользователь, связанный с этим сотрудником — удаляем и его каскадно
    const linkedUser = await new Promise((resolve, reject) => {
      this.db.get('SELECT id FROM users WHERE employee_id = ?', [id], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });

    if (linkedUser && linkedUser.id) {
      await this.deleteUserCascade(linkedUser.id);
    }

    // Удаляем самого сотрудника
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM employees WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  // Обновить сотрудника
  async updateEmployee(id, { first_name, last_name, birthday }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE employees SET first_name = ?, last_name = ?, birthday = ? WHERE id = ?',
        [first_name, last_name, birthday, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ПОЗДРАВЛЕНИЯМИ ====================

  // Добавить поздравление
  async addCongratulation({ employeeId, authorId, congratText, scheduledAt, fileUrl = null }) {
    return new Promise((resolve, reject) => {
      // Защита: если scheduledAt не передан, ставим текущую дату
      const safeScheduledAt = scheduledAt || new Date().toISOString();
      this.db.run(
        'INSERT INTO congratulations (employee_id, author_id, congrat_text, scheduled_at, file_url) VALUES (?, ?, ?, ?, ?)',
        [employeeId, authorId, congratText, safeScheduledAt, fileUrl ? fileUrl : null],
        function(err) {
          if (err) {
            console.error('[DB][addCongratulation][ERROR]', err, { employeeId, authorId, congratText, scheduledAt, fileUrl });
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

    // createCongratulation: совместим с API, вызывает addCongratulation
    async createCongratulation({ employeeId, authorId, congratText, scheduledAt, fileUrl = null }) {
      // Можно добавить валидацию, если нужно
      return this.addCongratulation({ employeeId, authorId, congratText, scheduledAt, fileUrl });
    }

    // Получить поздравление по id
    async getCongratulationById(id) {
      return new Promise((resolve, reject) => {
        this.db.get('SELECT * FROM congratulations WHERE id = ?', [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

      // Получить все поздравления с комментариями и лайками
      async getAllCongratulations() {
        return new Promise((resolve, reject) => {
          this.db.all('SELECT * FROM congratulations ORDER BY scheduled_at DESC, id DESC', async (err, rows) => {
            if (err) return reject(err);

            try {
              const withExtras = await Promise.all((rows || []).map(async (congrat) => {
                if (!congrat) return null;

                // Комментарии к поздравлению
                const comments = await new Promise((resolveCmts) => {
                  this.db.all(
                    `SELECT cc.comment_text, u.username, u.avatar
                     FROM congrat_comments cc
                     LEFT JOIN users u ON cc.user_id = u.id
                     WHERE cc.congrat_id = ?
                     ORDER BY cc.id ASC`,
                    [congrat.id],
                    (e, commentRows) => {
                      if (e) return resolveCmts([]);
                      resolveCmts((commentRows || []).map(r => ({
                        text: r.comment_text,
                        username: r.username || 'Пользователь',
                        avatar: r.avatar || null
                      })));
                    }
                  );
                });

                // Число лайков уже есть в congratulations.likes, но на всякий случай приводим к числу
                const likes = typeof congrat.likes === 'number' ? congrat.likes : Number(congrat.likes || 0);

                return {
                  ...congrat,
                  likes,
                  comments: Array.isArray(comments) ? comments : [],
                };
              }));

              resolve((withExtras || []).filter(Boolean));
            } catch (e) {
              reject(e);
            }
          });
        });
      }

        // Удалить все поздравления сотрудника по employee_id
        async deleteCongratulationsByEmployeeId(employeeId) {
          // Получаем все поздравления сотрудника
          const congratIds = await new Promise((resolve, reject) => {
            this.db.all('SELECT id FROM congratulations WHERE employee_id = ?', [employeeId], (err, rows) => {
              if (err) reject(err);
              else resolve(rows.map(r => r.id));
            });
          });

          // Удаляем комментарии и лайки для каждого поздравления
          for (const congratId of congratIds) {
            await new Promise((resolve, reject) => {
              this.db.run('DELETE FROM congrat_comments WHERE congrat_id = ?', [congratId], function(err) {
                if (err) reject(err); else resolve();
              });
            });
            await new Promise((resolve, reject) => {
              this.db.run('DELETE FROM congrat_likes WHERE congrat_id = ?', [congratId], function(err) {
                if (err) reject(err); else resolve();
              });
            });
          }

          // Теперь удаляем сами поздравления
          return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM congratulations WHERE employee_id = ?', [employeeId], function(err) {
              if (err) reject(err);
              else resolve(this.changes);
            });
          });
        }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЗАДАЧАМИ ====================

  async createTask({ title, description, assignedTo, deadline, priority, authorId, files }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO tasks (title, description, assignedTo, deadline, priority, authorId, file_info, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [title, description, assignedTo, deadline, priority || 'medium', authorId, files ? JSON.stringify(files) : null, 'open'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  async getAllTasks() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT t.*, 
                u.username as assignedToUsername, u.avatar as assignedToAvatar,
                au.username as authorUsername, au.avatar as authorAvatar
         FROM tasks t
         LEFT JOIN users u ON t.assignedTo = u.id
         LEFT JOIN users au ON t.authorId = au.id`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getCompletedTasks(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT t.*, u.username as assignedToUsername, u.avatar as assignedToAvatar
         FROM tasks t
         LEFT JOIN users u ON t.assignedTo = u.id
         WHERE (t.status = 'completed' OR t.status = 'closed') AND (t.authorId = ? OR t.assignedTo = ?)`,
        [userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async getOpenTasks(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT t.*, u.username as assignedToUsername, u.avatar as assignedToAvatar
         FROM tasks t
         LEFT JOIN users u ON t.assignedTo = u.id
         WHERE (t.status = 'open' OR t.status IS NULL OR t.status = '') AND (t.authorId = ? OR t.assignedTo = ?)`,
        [userId, userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  async deleteCompletedTasks(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM tasks WHERE (status = 'completed' OR status = 'closed') AND (authorId = ? OR assignedTo = ?)`,
        [userId, userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  async deleteTask(taskId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `DELETE FROM tasks WHERE id = ?`,
        [taskId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ОТГУЛАМИ ====================

  async createLeave({ userId, type, startDate, endDate, reason, minutes = 0, time = null, status = 'pending' }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO leaves (userId, type, startDate, endDate, reason, minutes, time, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, type, startDate, endDate, reason, minutes || 0, time, status],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  async getLeavesByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM leaves WHERE userId = ?', [userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async getAllLeaves() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM leaves', (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Получить заявку на отгул по id
  async getLeaveById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM leaves WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // Удалить заявку на отгул по id
  async deleteLeave(id) {
    // Получаем leave для проверки типа
    const leave = await this.getLeaveById(id);
    const outerThis = this;
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM leaves WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          const changes = this.changes; // SQLite statement changes
          
          // Если это отгул (type === 'leave'), удаляем связанные логи work_time_logs
          if (leave && leave.type === 'leave') {
            // Получаем username через метод экземпляра
            outerThis.getUserById(leave.userId).then(user => {
              if (user && user.username) {
                // Удаляем логи за период отгулов
                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                let d = new Date(start);
                while (d <= end) {
                  const dayStr = d.toISOString().slice(0, 10);
                  outerThis.db.run('DELETE FROM work_time_logs WHERE username = ? AND event_time LIKE ?', [user.username, `${dayStr}%`]);
                  d.setDate(d.getDate() + 1);
                }
              }
              resolve(changes);
            }).catch(err => {
              console.error('Cleanup error:', err);
              resolve(changes);
            });
          } else {
            resolve(changes);
          }
        }
      });
    });
  }
  // Обновить статус заявки на отгул
  async updateLeaveStatus(id, status) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE leaves SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ОТРАБОТКОЙ ОТГУЛОВ ====================

  // Добавить отработанное время для конкретного отгула (изолированная отработка)
  async addWorktimeForLeave(leaveId, userId, minutes, date) {
    return new Promise((resolve, reject) => {
      const createdAt = new Date().toISOString();
      console.log(`💾 DB: Adding isolated worktime - leaveId: ${leaveId}, userId: ${userId}, date: ${date}, minutes: ${minutes}`);
      
      this.db.run(
        'INSERT INTO leave_worktime (leave_id, user_id, date, minutes, created_at) VALUES (?, ?, ?, ?, ?)',
        [leaveId, userId, date, minutes, createdAt],
        function(err) {
          if (err) {
            console.error(`❌ DB: Failed to add isolated worktime:`, err);
            reject(err);
          } else {
            console.log(`✅ DB: Successfully added isolated worktime with ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Добавить запись о отработке отгула (legacy)
  async addLeaveWorktime({ leaveId, userId, date, minutes, createdAt }) {
    return new Promise((resolve, reject) => {
      console.log(`💾 DB: Adding leave worktime - leaveId: ${leaveId}, userId: ${userId}, date: ${date}, minutes: ${minutes}`);
      this.db.run(
        'INSERT INTO leave_worktime (leave_id, user_id, date, minutes, created_at) VALUES (?, ?, ?, ?, ?)',
        [leaveId, userId, date, minutes, createdAt],
        function(err) {
          if (err) {
            console.error(`❌ DB: Failed to add leave worktime:`, err);
            reject(err);
          } else {
            console.log(`✅ DB: Successfully added leave worktime with ID: ${this.lastID}`);
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Получить отработку для конкретного отгула
  async getLeaveWorktime(leaveId) {
    return new Promise((resolve, reject) => {
      console.log(`🔍 DB: Getting leave worktime for leaveId: ${leaveId}`);
      this.db.all(
        'SELECT * FROM leave_worktime WHERE leave_id = ? ORDER BY date DESC',
        [leaveId],
        (err, rows) => {
          if (err) {
            console.error(`❌ DB: Failed to get leave worktime:`, err);
            reject(err);
          } else {
            console.log(`✅ DB: Found ${rows?.length || 0} worktime records for leave ${leaveId}`);
            if (rows && rows.length > 0) {
              console.log(`   Records:`, rows.map(r => `${r.date}: ${r.minutes}min (id: ${r.id})`));
            }
            resolve(rows || []);
          }
        }
      );
    });
  }

  // Получить общую отработку пользователя по дате
  async getUserLeaveWorktimeByDate(userId, date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT lw.*, l.type, l.reason FROM leave_worktime lw JOIN leaves l ON lw.leave_id = l.id WHERE lw.user_id = ? AND lw.date = ?',
        [userId, date],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЛОГАМИ ВРЕМЕНИ ====================

  // Временный метод для очистки таблицы рабочих событий
  async clearWorkTimeLogs() {
    return new Promise((resolve, reject) => {
      outerThis.db.run('DELETE FROM work_time_logs', function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

    async addWorkTimeLog({ username, event_type, event_time, event_id }) {
      return new Promise((resolve, reject) => {
        this.db.run(
          'INSERT OR IGNORE INTO work_time_logs (username, event_type, event_time, event_id) VALUES (?, ?, ?, ?)',
          [username, event_type, event_time, event_id],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    }

    async getWorkTimeLogs({ start, end, username }) {
      return new Promise((resolve, reject) => {
        let query = 'SELECT * FROM work_time_logs WHERE 1=1';
        let params = [];
        if (start && end) {
          // Сравниваем только даты (без времени) для обоих форматов
          query += ` AND (
            (length(event_time) >= 10 AND substr(event_time, 3, 1) = '.' AND substr(event_time, 6, 1) = '.'
              AND (
                substr(event_time, 7, 4) || '-' || substr(event_time, 4, 2) || '-' || substr(event_time, 1, 2)
              ) >= ?
              AND (
                substr(event_time, 7, 4) || '-' || substr(event_time, 4, 2) || '-' || substr(event_time, 1, 2)
              ) <= ?
            )
            OR
            (length(event_time) >= 10 AND substr(event_time, 5, 1) = '-' AND substr(event_time, 8, 1) = '-' 
              AND substr(event_time, 1, 10) >= ?
              AND substr(event_time, 1, 10) <= ?
            )
          )`;
          params.push(start);
          params.push(end);
          params.push(start);
          params.push(end);
        }
        if (username) {
          query += ' AND username = ?';
          params.push(username);
        }
        this.db.all(query, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        });
      });
    }

  // ==================== МЕТОДЫ ДЛЯ ИНИЦИАЛИЗАЦИИ БАЗЫ ДАННЫХ ====================

  init() {
    this.db.serialize(() => {
      // Таблица пользователей
      this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          avatar TEXT DEFAULT '',
          online BOOLEAN DEFAULT 0,
          last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
          role TEXT DEFAULT 'user',
          employee_id INTEGER,
          token TEXT DEFAULT '',
          department TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      // Добавляем недостающие поля для старых баз
      this.db.run(`ALTER TABLE users ADD COLUMN token TEXT DEFAULT ''`, (err) => {});
      this.db.run(`ALTER TABLE users ADD COLUMN employee_id INTEGER`, (err) => {});
      this.db.run(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`, (err) => {});
      this.db.run(`ALTER TABLE users ADD COLUMN department TEXT`, (err) => {});

      // Таблица чатов
      this.db.run(`
        CREATE TABLE IF NOT EXISTS chats (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          type TEXT DEFAULT 'private',
          created_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users (id)
        )
      `);

      // Таблица участников чатов
      this.db.run(`
        CREATE TABLE IF NOT EXISTS chat_participants (
          chat_id INTEGER,
          user_id INTEGER,
          joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (chat_id, user_id),
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Таблица сообщений с поддержкой файлов и ответов
      this.db.run(`
        CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          file_info TEXT,
          reply_to_id INTEGER,
          template_type TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (reply_to_id) REFERENCES messages (id)
        )
      `);

      // Таблица задач
      this.db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          assignedTo INTEGER,
          deadline TEXT,
          status TEXT DEFAULT 'open',
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          authorId INTEGER,
          assignedToToken TEXT,
          completedAt TEXT,
          completionComment TEXT,
          FOREIGN KEY (assignedTo) REFERENCES users(id),
          FOREIGN KEY (authorId) REFERENCES users(id)
        )
      `);
      // Добавляем новые поля для старых баз
      this.db.run(`ALTER TABLE tasks ADD COLUMN assignedToToken TEXT`, (err) => {});
      this.db.run(`ALTER TABLE tasks ADD COLUMN completedAt TEXT`, (err) => {});
      this.db.run(`ALTER TABLE tasks ADD COLUMN completionComment TEXT`, (err) => {});

      // Таблица запланированных сообщений
      this.db.run(`
        CREATE TABLE IF NOT EXISTS scheduled_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chat_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          message_type TEXT DEFAULT 'text',
          file_info TEXT,
          reply_to_id INTEGER,
          scheduled_for DATETIME NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          sent_at DATETIME,
          status TEXT DEFAULT 'pending',
          repeat_type TEXT DEFAULT 'none',
          repeat_days TEXT,
          repeat_until DATETIME,
          is_recurring BOOLEAN DEFAULT 0,
          parent_recurring_id INTEGER,
          FOREIGN KEY (chat_id) REFERENCES chats (id),
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (reply_to_id) REFERENCES messages (id),
          FOREIGN KEY (parent_recurring_id) REFERENCES scheduled_messages (id)
        )
      `);

      // Добавляем новые поля для существующих таблиц (если их еще нет)
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN repeat_type TEXT DEFAULT 'none'`, () => {});
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN repeat_days TEXT`, () => {});
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN repeat_until DATETIME`, () => {});
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN is_recurring BOOLEAN DEFAULT 0`, () => {});
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN parent_recurring_id INTEGER`, () => {});
      this.db.run(`ALTER TABLE scheduled_messages ADD COLUMN timezone_offset INTEGER DEFAULT 0`, () => {});

      // Таблица статуса прочитанности сообщений
      this.db.run(`
        CREATE TABLE IF NOT EXISTS message_reads (
          message_id INTEGER,
          user_id INTEGER,
          read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (message_id, user_id),
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Таблица лайков сообщений
      this.db.run(`
        CREATE TABLE IF NOT EXISTS message_likes (
          message_id INTEGER,
          user_id INTEGER,
          emoji TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (message_id, user_id, emoji),
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);

      // Таблица отпусков (leaves)
      this.db.run(
        'CREATE TABLE IF NOT EXISTS leaves (' +
        'id INTEGER PRIMARY KEY AUTOINCREMENT, ' +
        'userId INTEGER NOT NULL, ' +
        'type TEXT NOT NULL, ' +
        'startDate TEXT NOT NULL, ' +
        'endDate TEXT NOT NULL, ' +
        'reason TEXT, ' +
        'minutes INTEGER DEFAULT 0, ' +
        'time TEXT, ' +
        "status TEXT DEFAULT 'pending', " +
        'created_at DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
        'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, ' +
        'FOREIGN KEY (userId) REFERENCES users(id)'
        + ')'
      );
      // Добавляем колонку minutes для старых баз
      this.db.run('ALTER TABLE leaves ADD COLUMN minutes INTEGER DEFAULT 0', () => {});
      // Добавляем колонку time для старых баз
      this.db.run('ALTER TABLE leaves ADD COLUMN time TEXT', () => {});

      // Таблица отработки отгулов
      this.db.run(`
        CREATE TABLE IF NOT EXISTS leave_worktime (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          leave_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          date TEXT NOT NULL,
          minutes INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          FOREIGN KEY (leave_id) REFERENCES leaves(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Таблица новостей
      this.db.run(`
        CREATE TABLE IF NOT EXISTS news (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          authorId INTEGER,
          createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
          publishAt TEXT DEFAULT CURRENT_TIMESTAMP,
          type TEXT DEFAULT 'news',
          question TEXT,
          options TEXT,
          votes TEXT,
          voters TEXT,
          FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      
      // Добавляем поля votes и voters для опросов в news (если не существуют)
      this.db.run(`ALTER TABLE news ADD COLUMN votes TEXT`, () => {});
      this.db.run(`ALTER TABLE news ADD COLUMN voters TEXT`, () => {});

      // Настройки SQLite для снижения блокировок и корректности ссылок
      this.db.run('PRAGMA foreign_keys = ON');
      this.db.run("PRAGMA journal_mode = WAL");
      this.db.run('PRAGMA busy_timeout = 5000');

      // Таблица сотрудников
      this.db.run(`CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        birthday TEXT,
        avatar_url TEXT,
        department TEXT
      )`);
      // Добавить поле avatar_url для старых баз
      this.db.run(`ALTER TABLE employees ADD COLUMN avatar_url TEXT`, () => {});
      // Добавить поле department для старых баз
      this.db.run(`ALTER TABLE employees ADD COLUMN department TEXT`, () => {});
      // Добавить поля для даты рождения (миграция)
      this.db.run(`ALTER TABLE employees ADD COLUMN birth_day INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding birth_day column:', err);
        }
      });
      this.db.run(`ALTER TABLE employees ADD COLUMN birth_month INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding birth_month column:', err);
        }
      });
      this.db.run(`ALTER TABLE employees ADD COLUMN birth_year INTEGER`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding birth_year column:', err);
        }
      });

      // Таблица быстрых шаблонов сообщений по департаментам
      this.db.run(`
        CREATE TABLE IF NOT EXISTS quick_templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          department TEXT,
          title TEXT,
          content TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Добавляем поле type если его нет (миграция)
      this.db.run(`
        ALTER TABLE quick_templates ADD COLUMN type TEXT DEFAULT 'info'
      `, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          console.error('Error adding type column to quick_templates:', err);
        }
      });

      // Таблица поздравлений сотрудников
      this.db.run(`CREATE TABLE IF NOT EXISTS congratulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        author_id INTEGER,
        congrat_text TEXT NOT NULL,
        file_url TEXT,
        scheduled_at TEXT,
        sent INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0
      )`);
      // Добавить поле file_url для старых баз
      this.db.run(`ALTER TABLE congratulations ADD COLUMN file_url TEXT`, () => {});
      // Добавить поле author_id для старых баз
      this.db.run(`ALTER TABLE congratulations ADD COLUMN author_id INTEGER`, () => {});

      // Таблица комментариев к поздравлениям
      this.db.run(`CREATE TABLE IF NOT EXISTS congrat_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        congrat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment_text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);

      // Таблица лайков для поздравлений (если не существует)
      this.db.run(`CREATE TABLE IF NOT EXISTS congrat_likes (
        congrat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (congrat_id, user_id),
        FOREIGN KEY (congrat_id) REFERENCES congratulations(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      
      // Лайки к новостям
      this.db.run(`CREATE TABLE IF NOT EXISTS news_likes (
        news_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        emoji TEXT,
        PRIMARY KEY (news_id, user_id),
        FOREIGN KEY (news_id) REFERENCES news(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      
      // Комментарии к новостям
      this.db.run(`CREATE TABLE IF NOT EXISTS news_comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        news_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        comment_text TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (news_id) REFERENCES news(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      
      // Таблица логов рабочего времени
      this.db.run(`CREATE TABLE IF NOT EXISTS work_time_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        event_type TEXT NOT NULL, -- login, logout
        event_time TEXT NOT NULL, -- ISO8601
        event_id INTEGER NOT NULL, -- 4624, 4634
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`);
      // Удаляем дубликаты перед созданием уникального индекса
      this.db.run(`
        DELETE FROM work_time_logs
        WHERE id NOT IN (
          SELECT MIN(id) FROM work_time_logs GROUP BY username, event_time, event_type
        )
      `, () => {
        // Уникальный индекс для предотвращения дублей одной и той же записи
        this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_wtl_unique ON work_time_logs (username, event_time, event_type)', () => {});
      });

      // Добавляем новые колонки если они не существуют (для совместимости)
      this.db.run(`ALTER TABLE messages ADD COLUMN file_info TEXT`, () => {});
      this.db.run(`ALTER TABLE messages ADD COLUMN reply_to_id INTEGER`, () => {});
      
      // Таблица для хранения паролей локальных пользователей Windows
      this.db.run(`
        CREATE TABLE IF NOT EXISTS local_user_passwords (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, () => {});
      // Добавляем колонку emoji если не существует
      this.db.get("PRAGMA table_info('message_likes')", (err, info) => {
        if (!err && info && !Array.isArray(info) && (!info.find || !info.find(col => col.name === 'emoji'))) {
          this.db.run(`ALTER TABLE message_likes ADD COLUMN emoji TEXT`, () => {});
        }
      });
      
      // Создание таблицы для лайков поздравлений (если не существует)
      this.db.run(`CREATE TABLE IF NOT EXISTS congrat_likes (
        congrat_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        PRIMARY KEY (congrat_id, user_id),
        FOREIGN KEY (congrat_id) REFERENCES congratulations(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Таблицы для учёта отработки по выходным
      this.db.run(`CREATE TABLE IF NOT EXISTS weekend_work_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        start_ts INTEGER,
        end_ts INTEGER,
        manual INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      // Добавляем колонку completed для старых баз
      this.db.run(`ALTER TABLE weekend_work_sessions ADD COLUMN completed INTEGER DEFAULT 0`, () => {});
      // Добавляем колонку leave_id для привязки к конкретному отгулу
      this.db.run(`ALTER TABLE weekend_work_sessions ADD COLUMN leave_id INTEGER`, () => {});
      this.db.run(`CREATE TABLE IF NOT EXISTS weekend_work_timer (
        user_id INTEGER PRIMARY KEY,
        start_ts INTEGER NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Таблицы для учёта отработки по будням (до 9:00 и после 18:00)
      this.db.run(`CREATE TABLE IF NOT EXISTS weekday_work_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        minutes INTEGER NOT NULL,
        start_ts INTEGER,
        end_ts INTEGER,
        manual INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);
      // Добавляем колонку completed для старых баз
      this.db.run(`ALTER TABLE weekday_work_sessions ADD COLUMN completed INTEGER DEFAULT 0`, () => {});
      // Добавляем колонку leave_id для привязки к конкретному отгулу
      this.db.run(`ALTER TABLE weekday_work_sessions ADD COLUMN leave_id INTEGER`, () => {});
      this.db.run(`CREATE TABLE IF NOT EXISTS weekday_work_timer (
        user_id INTEGER PRIMARY KEY,
        start_ts INTEGER NOT NULL,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      // Таблица верификаций отработки отгулов (HR/Admin подтверждение)
      this.db.run(`CREATE TABLE IF NOT EXISTS worktime_verifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL, -- 'pending', 'checking', 'completed', 'done'
        leave_minutes INTEGER DEFAULT 0,
        worked_minutes INTEGER DEFAULT 0,
        verified_by INTEGER,
        verified_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )`);

      // Таблица истории отработок отгулов
      this.db.run(`CREATE TABLE IF NOT EXISTS worktime_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        date TEXT NOT NULL,
        leave_type TEXT DEFAULT 'hours',
        required_minutes INTEGER NOT NULL,
        worked_minutes INTEGER NOT NULL,
        overtime_minutes INTEGER DEFAULT 0,
        login_time TEXT,
        logout_time TEXT,
        status TEXT DEFAULT 'pending',
        verified_by INTEGER,
        verified_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (verified_by) REFERENCES users(id)
      )`);

      // Таблица для сохранения состояния таймера отработки
      this.db.run(`CREATE TABLE IF NOT EXISTS worktime_timer_state (
        user_id INTEGER PRIMARY KEY,
        state_data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, (err) => {
        if (err) console.error('Error creating worktime_timer_state table:', err);
      });

      // Таблица закрепленных сообщений
      this.db.run(`CREATE TABLE IF NOT EXISTS pinned_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id INTEGER NOT NULL,
        chat_id INTEGER NOT NULL,
        pinned_by INTEGER NOT NULL,
        pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
        FOREIGN KEY (pinned_by) REFERENCES users(id),
        UNIQUE(message_id, chat_id, pinned_by)
      )`, (err) => {
        if (err) console.error('Error creating pinned_messages table:', err);
        else console.log('✅ pinned_messages table created successfully');
      });

      // Миграция: добавляем поле template_type в таблицу messages
      this.db.run(`ALTER TABLE messages ADD COLUMN template_type TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Migration error (template_type):', err);
        } else if (!err) {
          console.log('✅ Migration: template_type column added to messages table');
        }
      });

      // Миграция: добавляем поле is_pinned в таблицу messages
      this.db.run(`ALTER TABLE messages ADD COLUMN is_pinned INTEGER DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Migration error (is_pinned):', err);
        } else if (!err) {
          console.log('✅ Migration: is_pinned column added to messages table');
        }
      });

      // Миграция: пересоздаем таблицу pinned_messages с правильными ограничениями
      this.db.run(`DROP TABLE IF EXISTS pinned_messages_old`, (err) => {
        if (err) console.error('❌ Migration error (drop old table):', err);
      });
      
      this.db.run(`ALTER TABLE pinned_messages RENAME TO pinned_messages_old`, (err) => {
        if (err && !err.message.includes('no such table')) {
          console.error('❌ Migration error (rename table):', err);
        }
        
        // Создаем новую таблицу с правильной структурой
        this.db.run(`CREATE TABLE IF NOT EXISTS pinned_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id INTEGER NOT NULL,
          chat_id INTEGER NOT NULL,
          pinned_by INTEGER NOT NULL,
          pinned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
          FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
          FOREIGN KEY (pinned_by) REFERENCES users(id),
          UNIQUE(message_id, chat_id, pinned_by)
        )`, (err) => {
          if (err) {
            console.error('❌ Migration error (create new table):', err);
          } else {
            console.log('✅ Migration: pinned_messages table recreated with correct structure');
            
            // Копируем данные из старой таблицы (если она существует)
            this.db.run(`INSERT OR IGNORE INTO pinned_messages (message_id, chat_id, pinned_by, pinned_at)
                         SELECT message_id, chat_id, pinned_by, pinned_at FROM pinned_messages_old`, (err) => {
              if (err && !err.message.includes('no such table')) {
                console.error('❌ Migration error (copy data):', err);
              } else if (!err) {
                console.log('✅ Migration: data copied to new pinned_messages table');
              }
              
              // Удаляем старую таблицу
              this.db.run(`DROP TABLE IF EXISTS pinned_messages_old`, (err) => {
                if (err) console.error('❌ Migration error (drop old table final):', err);
              });
            });
          }
        });
      });
    });
  }

  // ==================== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ====================

  async deleteUserCascade(userId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Удаляем связи пользователя в чатах
        this.db.run('DELETE FROM chat_participants WHERE user_id = ?', [userId]);
        // Удаляем лайки и прочтения сообщений пользователя
        this.db.run('DELETE FROM message_likes WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM message_reads WHERE user_id = ?', [userId]);
        // Удаляем комментарии/лайки/новости пользователя
        this.db.run('DELETE FROM news_comments WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM news_likes WHERE user_id = ?', [userId]);
        // Сообщения пользователя
        this.db.run('DELETE FROM messages WHERE user_id = ?', [userId]);
        // Поздравления: комментарии и лайки пользователя
        this.db.run('DELETE FROM congrat_comments WHERE user_id = ?', [userId]);
        this.db.run('DELETE FROM congrat_likes WHERE user_id = ?', [userId]);
        // Заявки на отпуска
        this.db.run('DELETE FROM leaves WHERE userId = ?', [userId]);
        // Задачи
        this.db.run('DELETE FROM tasks WHERE assignedTo = ? OR authorId = ?', [userId, userId]);

        // Наконец удаляем пользователя
        this.db.run('DELETE FROM users WHERE id = ?', [userId], function(err){
          if (err) return reject(err);
        });
      });
    });
  }

  async getMessageStatistics(messageId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          m.*,
          u.username as author,
          (SELECT COUNT(*) FROM message_likes ml WHERE ml.message_id = m.id) as likes_count,
          (SELECT COUNT(*) FROM message_reads mr WHERE mr.message_id = m.id) as reads_count
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = ?
      `, [messageId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getChatStatistics(chatId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(DISTINCT m.id) as total_messages,
          COUNT(DISTINCT cp.user_id) as total_participants,
          COUNT(DISTINCT ml.user_id) as total_likes,
          MAX(m.created_at) as last_activity
        FROM chats c
        LEFT JOIN messages m ON c.id = m.chat_id
        LEFT JOIN chat_participants cp ON c.id = cp.chat_id
        LEFT JOIN message_likes ml ON m.id = ml.message_id
        WHERE c.id = ?
      `, [chatId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async getUserStatistics(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(DISTINCT m.id) as messages_sent,
          COUNT(DISTINCT ml.message_id) as likes_given,
          COUNT(DISTINCT ml2.message_id) as likes_received,
          COUNT(DISTINCT cp.chat_id) as chats_joined
        FROM users u
        LEFT JOIN messages m ON u.id = m.user_id
        LEFT JOIN message_likes ml ON u.id = ml.user_id
        LEFT JOIN message_likes ml2 ON m.id = ml2.message_id
        LEFT JOIN chat_participants cp ON u.id = cp.user_id
        WHERE u.id = ?
      `, [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ ОЧИСТКИ И ОБСЛУЖИВАНИЯ ====================

  async cleanupOldData(daysOld = 30) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Удаляем старые записи о прочитанности
        this.db.run(`
          DELETE FROM message_reads 
          WHERE read_at < datetime('now', '-${daysOld} days')
        `);
        
        // Удаляем пустые чаты (без участников)
        this.db.run(`
          DELETE FROM chats 
          WHERE id NOT IN (
            SELECT DISTINCT chat_id FROM chat_participants
          )
        `);
        
        // Удаляем старые сообщения (опционально)
        // this.db.run(`
        //   DELETE FROM messages 
        //   WHERE created_at < datetime('now', '-${daysOld} days')
        // `);
        
        resolve();
      });
    });
  }

  async cleanupOrphanedData() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        console.log('🧹 Cleaning up orphaned data...');
        
        // Удаляем лайки для несуществующих сообщений
        this.db.run(`
          DELETE FROM message_likes 
          WHERE message_id NOT IN (SELECT id FROM messages)
        `);
        
        // Удаляем записи о прочитанности для несуществующих сообщений
        this.db.run(`
          DELETE FROM message_reads 
          WHERE message_id NOT IN (SELECT id FROM messages)
        `);
        
        // Удаляем участников несуществующих чатов
        this.db.run(`
          DELETE FROM chat_participants 
          WHERE chat_id NOT IN (SELECT id FROM chats)
        `);
        
        // Удаляем сообщения из несуществующих чатов
        this.db.run(`
          DELETE FROM messages 
          WHERE chat_id NOT IN (SELECT id FROM chats)
        `);
        
        console.log('✅ Orphaned data cleanup completed');
        resolve();
      });
    });
  }

  async vacuum() {
    return new Promise((resolve, reject) => {
      console.log('🗜️ Running database vacuum...');
      this.db.run('VACUUM', (err) => {
        if (err) {
          console.error('❌ Vacuum failed:', err);
          reject(err);
        } else {
          console.log('✅ Database vacuum completed');
          resolve();
        }
      });
    });
  }

  async getDatabaseInfo() {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM chats) as total_chats,
          (SELECT COUNT(*) FROM messages) as total_messages,
          (SELECT COUNT(*) FROM message_likes) as total_likes,
          (SELECT COUNT(*) FROM chat_participants) as total_participants
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  // ==================== WEEKEND WORK (SERVER-SIDE STORAGE) ====================
  async upsertWeekendTimer(userId, startTs) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO weekend_work_timer (user_id, start_ts) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET start_ts = excluded.start_ts, started_at = CURRENT_TIMESTAMP',
        [userId, startTs],
        function(err) { if (err) reject(err); else resolve(true); }
      );
    });
  }

  async getWeekendTimer(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM weekend_work_timer WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err); else resolve(row || null);
      });
    });
  }

  async clearWeekendTimer(userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM weekend_work_timer WHERE user_id = ?', [userId], function(err){ if (err) reject(err); else resolve(this.changes); });
    });
  }

  async addWeekendSession({ userId, date, minutes, startTs = null, endTs = null, manual = 0, leaveId = null }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO weekend_work_sessions (user_id, date, minutes, start_ts, end_ts, manual, leave_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [userId, date, minutes, startTs, endTs, manual ? 1 : 0, leaveId],
        function(err){ if (err) reject(err); else resolve(this.changes); }
      );
    });
  }

  async getWeekendSessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekend_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  // ==================== WEEKDAY WORK (SERVER-SIDE STORAGE) ====================
  async upsertWeekdayTimer(userId, startTs) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO weekday_work_timer (user_id, start_ts) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET start_ts = excluded.start_ts, started_at = CURRENT_TIMESTAMP',
        [userId, startTs],
        function(err) { if (err) reject(err); else resolve(true); }
      );
    });
  }

  async getWeekdayTimer(userId) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM weekday_work_timer WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  }

  async clearWeekdayTimer(userId) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM weekday_work_timer WHERE user_id = ?', [userId], function(err){ if (err) reject(err); else resolve(this.changes); });
    });
  }

  async addWeekdaySession({ userId, date, minutes, startTs = null, endTs = null, manual = 0 }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO weekday_work_sessions (user_id, date, minutes, start_ts, end_ts, manual) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, date, minutes, startTs, endTs, manual ? 1 : 0],
        function(err){ if (err) reject(err); else resolve(this.lastID); }
      );
    });
  }

  async getWeekdaySessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekday_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  // ==================== МЕТОДЫ: ВЕРИФИКАЦИИ ОТРАБОТОК ====================
  async upsertWorktimeVerification({ userId, date, status = 'done', leaveMinutes = 0, workedMinutes = 0, verifiedBy }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO worktime_verifications (user_id, date, status, leave_minutes, worked_minutes, verified_by)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, date) DO UPDATE SET 
           status = excluded.status,
           leave_minutes = excluded.leave_minutes,
           worked_minutes = excluded.worked_minutes,
           verified_by = excluded.verified_by,
           verified_at = CURRENT_TIMESTAMP`,
        [userId, date, status, leaveMinutes, workedMinutes, verifiedBy],
        function(err){ if (err) reject(err); else resolve(true); }
      );
    });
  }

  async getWorktimeVerification(userId, date) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM worktime_verifications WHERE user_id = ? AND date = ?', [userId, date], (err, row) => {
        if (err) reject(err); else resolve(row || null);
      });
    });
  }

  async getWorktimeVerificationsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM worktime_verifications WHERE date = ?', [date], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  }

  async getWorktimeVerificationsByUser(userId) {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM worktime_verifications WHERE user_id = ? ORDER BY date DESC', [userId], (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  }

  // Получить данные отработки для HR (все пользователи)
  async getHRWorktimeData(date) {
    return new Promise((resolve, reject) => {
      const query = `
        WITH session_minutes AS (
          SELECT user_id, SUM(minutes) AS total_minutes
          FROM (
            SELECT user_id, minutes FROM weekend_work_sessions WHERE date = ?
            UNION ALL
            SELECT user_id, minutes FROM weekday_work_sessions WHERE date = ?
          )
          GROUP BY user_id
        ),
        leaves_required AS (
          SELECT 
            userId AS user_id,
            SUM(
              CASE 
                WHEN substr(?,1,10) BETWEEN substr(startDate,1,10) AND substr(endDate,1,10) THEN 
                  CASE 
                    WHEN substr(?,1,10) = substr(startDate,1,10) AND substr(?,1,10) = substr(endDate,1,10) AND IFNULL(minutes,0) > 0 THEN minutes
                    WHEN substr(?,1,10) = substr(startDate,1,10) AND substr(?,1,10) = substr(endDate,1,10) AND IFNULL(minutes,0) = 0 THEN 480
                    WHEN substr(?,1,10) = substr(startDate,1,10) THEN 480
                    WHEN substr(?,1,10) = substr(endDate,1,10) THEN 480
                    ELSE 480
                  END
                ELSE 0 
              END
            ) AS leave_minutes
          FROM leaves
          WHERE status = 'approved'
            AND substr(?,1,10) BETWEEN substr(startDate,1,10) AND substr(endDate,1,10)
          GROUP BY userId
        )
        SELECT 
          u.id AS userId,
          u.username AS userName,
          u.role AS userRole,
          u.avatar,
          COALESCE(wv.leave_minutes, lr.leave_minutes, 0) AS requiredMinutes,
          COALESCE(wv.worked_minutes, sm.total_minutes, 0) AS workedMinutes,
          CASE 
            WHEN wv.status = 'verified' THEN 'completed'
            WHEN wv.status = 'rejected' THEN 'pending'
            WHEN COALESCE(wv.leave_minutes, lr.leave_minutes, 0) = 0 AND COALESCE(wv.worked_minutes, sm.total_minutes, 0) > 0 THEN 'checking'
            WHEN COALESCE(wv.worked_minutes, sm.total_minutes, 0) >= COALESCE(wv.leave_minutes, lr.leave_minutes, 0) AND COALESCE(wv.leave_minutes, lr.leave_minutes, 0) > 0 THEN 'checking'
            WHEN COALESCE(wv.leave_minutes, lr.leave_minutes, 0) > 0 THEN 'pending'
            ELSE 'pending'
          END AS status,
          wv.verified_at,
          wv.verified_by
        FROM users u
        LEFT JOIN worktime_verifications wv ON u.id = wv.user_id AND wv.date = ?
        LEFT JOIN session_minutes sm ON sm.user_id = u.id
        LEFT JOIN leaves_required lr ON lr.user_id = u.id
        WHERE (lr.leave_minutes > 0 OR wv.user_id IS NOT NULL)
        ORDER BY u.username
      `;

      this.db.all(query, [date, date, date, date, date, date, date, date, date, date, date], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Получить детальную информацию по отработке пользователя
  async getUserWorktimeDetails(userId, date) {
    return new Promise((resolve, reject) => {
      // Получаем основную информацию о пользователе
      this.db.get('SELECT id, username, role, avatar FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) {
          console.error('[getUserWorktimeDetails] users lookup error:', err);
          reject(err);
          return;
        }
        
        if (!user) {
          resolve(null);
          return;
        }

        // Получаем информацию о верификации
        this.db.get(`
          SELECT * FROM worktime_verifications 
          WHERE user_id = ? AND date = ?
        `, [userId, date], (err, verification) => {
          if (err) {
            console.error('[getUserWorktimeDetails] worktime_verifications lookup error:', err);
            reject(err);
            return;
          }

          // Получаем сессии отработки
          this.db.all(`
            SELECT 
              'weekend' as type,
              date,
              minutes,
              completed,
              created_at
            FROM weekend_work_sessions 
            WHERE user_id = ? AND date = ?
            UNION ALL
            SELECT 
              'weekday' as type,
              date,
              minutes,
              completed,
              created_at
            FROM weekday_work_sessions 
            WHERE user_id = ? AND date = ?
            ORDER BY created_at
          `, [userId, date, userId, date], (err, sessions) => {
            if (err) {
              console.error('[getUserWorktimeDetails] sessions union lookup error:', err);
              reject(err);
              return;
            }

            // Получаем информацию об отгуле
            // Приводим имена полей к ожидаемым alias-ам из текущей схемы (camelCase)
            this.db.get(`
              SELECT 
                startDate AS start_date,
                endDate   AS end_date,
                minutes   AS total_minutes
              FROM leaves 
              WHERE userId = ? AND status = 'approved'
                AND substr(startDate,1,10) <= ? AND substr(endDate,1,10) >= ?
              ORDER BY startDate DESC
              LIMIT 1
            `, [userId, date, date], (err, leave) => {
              if (err) {
                console.error('[getUserWorktimeDetails] leaves lookup error:', err);
                reject(err);
                return;
              }

              const sessionList = Array.isArray(sessions) ? sessions : [];
              const computedWorked = sessionList.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
              const vRequired = (verification && verification.leave_minutes != null ? Number(verification.leave_minutes) : null);
              const vWorked = (verification && verification.worked_minutes != null ? Number(verification.worked_minutes) : null);

              // Предпочитаем НЕ нулевые значения: если верификация есть, но 0 минут, используем расчёт из leaves/сессий
              let requiredMinutes = (vRequired != null && vRequired > 0)
                ? vRequired
                : (leave && leave.total_minutes != null ? Number(leave.total_minutes) : 0);
              let workedMinutes = (vWorked != null && vWorked > 0)
                ? vWorked
                : computedWorked;

              // Если нет требуемых минут, но есть отработанные сессии — покажем факт (чтобы не было NaN процентов)
              if (requiredMinutes === 0 && workedMinutes > 0) {
                requiredMinutes = workedMinutes;
              }

              let status = verification?.status || 'pending';
              if (!verification?.status) {
                if (requiredMinutes > 0 && workedMinutes >= requiredMinutes) {
                  status = 'checking';
                } else {
                  status = 'pending';
                }
              }

              const result = {
                userId: user.id,
                userName: user.username,
                userRole: user.role,
                avatar: user.avatar,
                leaveStartDate: leave?.start_date || date,
                leaveEndDate: leave?.end_date || date,
                requiredMinutes,
                workedMinutes,
                status,
                sessions: sessionList,
                verifiedAt: verification?.verified_at,
                verifiedBy: verification?.verified_by
              };

              resolve(result);
            });
          });
        });
      });
    });
  }

  async clearTodaySessions(userId, date) {
    // Backward-compat alias: previously deleted; now mark completed only
    return this.markTodaySessionsCompleted(userId, date);
  }

  async markTodaySessionsCompleted(userId, date) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('UPDATE weekend_work_sessions SET completed = 1 WHERE user_id = ? AND date = ?', [userId, date], (err) => {
          if (err) return reject(err);
          this.db.run('UPDATE weekday_work_sessions SET completed = 1 WHERE user_id = ? AND date = ?', [userId, date], (err2) => {
            if (err2) return reject(err2);
            resolve(true);
          });
        });
      });
    });
  }

  // Получить все сессии (включая завершенные) для статистики
  async getAllWeekendSessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekend_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  async getAllWeekdaySessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekday_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  // Получить сессии отработки по выходным для конкретной даты
  async getWeekendSessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekend_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  // Получить сессии отработки по будням для конкретной даты
  async getWeekdaySessionsByDate(date) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekday_work_sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.date = ?`,
        [date],
        (err, rows) => { if (err) reject(err); else resolve(rows || []); }
      );
    });
  }

  // Закрытие соединения с базой данных
  close() {
    return new Promise((resolve, reject) => {
      console.log('🔌 Closing database connection...');
      this.db.close((err) => {
        if (err) {
          console.error('❌ Database close error:', err);
          reject(err);
        } else {
          console.log('✅ Database connection closed');
          resolve();
        }
      });
    });
  }

  // Удалить поздравление по id
  async deleteCongratulation(id) {
    // Удаляем комментарии
    await new Promise((resolve, reject) => {
      this.db.run('DELETE FROM congrat_comments WHERE congrat_id = ?', [id], function(err) {
        if (err) reject(err); else resolve();
      });
    });
    // Удаляем лайки
    await new Promise((resolve, reject) => {
      this.db.run('DELETE FROM congrat_likes WHERE congrat_id = ?', [id], function(err) {
        if (err) reject(err); else resolve();
      });
    });
    // Удаляем поздравление
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM congratulations WHERE id = ?', [id], function(err) {
        if (err) reject(err); else resolve(this.changes);
      });
    });
  }

  // Получить список уникальных пользователей из work_time_logs
  async getUniqueUsers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT DISTINCT username FROM work_time_logs ORDER BY username', [], (err, rows) => {
        if (err) return reject(err);
        const users = rows.map(r => r.username).filter(Boolean);
        resolve(users);
      });
    });
  }

  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ИСТОРИЕЙ ОТРАБОТОК ====================

  // Создать запись в истории отработок
  async createWorktimeHistory({ userId, username, date, requiredMinutes, workedMinutes, overtimeMinutes = 0, loginTime = null, logoutTime = null, status = 'pending' }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO worktime_history (user_id, username, date, required_minutes, worked_minutes, overtime_minutes, login_time, logout_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, username, date, requiredMinutes, workedMinutes, overtimeMinutes, loginTime, logoutTime, status],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  // Обновить статус записи в истории отработок
  async updateWorktimeHistoryStatus(id, status, verifiedBy = null) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.run(
        `UPDATE worktime_history 
         SET status = ?, verified_by = ?, verified_at = ?, updated_at = ?
         WHERE id = ?`,
        [status, verifiedBy, now, now, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Получить историю отработок пользователя
  async getWorktimeHistory(userId = null, dateFrom = null, dateTo = null, status = null) {
    return new Promise((resolve, reject) => {
      let query = `
        SELECT h.*, u.username as verified_by_username 
        FROM worktime_history h
        LEFT JOIN users u ON u.id = h.verified_by
        WHERE 1=1
      `;
      const params = [];

      if (userId) {
        query += ' AND h.user_id = ?';
        params.push(userId);
      }

      if (dateFrom) {
        query += ' AND h.date >= ?';
        params.push(dateFrom);
      }

      if (dateTo) {
        query += ' AND h.date <= ?';
        params.push(dateTo);
      }

      if (status) {
        query += ' AND h.status = ?';
        params.push(status);
      }

      query += ' ORDER BY h.date DESC, h.created_at DESC';

      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // Получить запись истории отработки по дате и пользователю
  async getWorktimeHistoryByUserAndDate(userId, date) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM worktime_history WHERE user_id = ? AND date = ? ORDER BY created_at DESC LIMIT 1',
        [userId, date],
        (err, row) => {
          if (err) reject(err);
          else resolve(row || null);
        }
      );
    });
  }

  // Получить все сессии отработки по будням
  async getAllWeekdaySessions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekday_work_sessions s
         LEFT JOIN users u ON s.user_id = u.id
         ORDER BY s.date DESC, s.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Получить все сессии отработки по выходным
  async getAllWeekendSessions() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, u.username FROM weekend_work_sessions s
         LEFT JOIN users u ON s.user_id = u.id
         ORDER BY s.date DESC, s.created_at DESC`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  }

  // Обновить верификацию отработки с расширенными статусами
  async updateWorktimeVerificationStatus(userId, date, status, verifiedBy = null) {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      this.db.run(
        `UPDATE worktime_verifications 
         SET status = ?, verified_by = ?, verified_at = ?
         WHERE user_id = ? AND date = ?`,
        [status, verifiedBy, now, userId, date],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ СОХРАНЕНИЯ СОСТОЯНИЯ ТАЙМЕРА ====================
  
  // Сохранить состояние таймера пользователя
  async saveWorktimeTimerState(userId, timerState) {
    return new Promise((resolve, reject) => {
      const stateJson = JSON.stringify(timerState);
      const now = new Date().toISOString();
      
      this.db.run(
        `INSERT OR REPLACE INTO worktime_timer_state (user_id, state_data, updated_at) 
         VALUES (?, ?, ?)`,
        [userId, stateJson, now],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // Получить состояние таймера пользователя
  async getWorktimeTimerState(userId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT state_data FROM worktime_timer_state WHERE user_id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else {
            if (row && row.state_data) {
              try {
                const parsedState = JSON.parse(row.state_data);
                resolve(parsedState);
              } catch (e) {
                console.error('Ошибка парсинга состояния таймера:', e);
                resolve(null);
              }
            } else {
              resolve(null);
            }
          }
        }
      );
    });
  }

  // Очистить состояние таймера пользователя
  async clearWorktimeTimerState(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM worktime_timer_state WHERE user_id = ?',
        [userId],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // ==================== МЕТОДЫ ДЛЯ ЗАКРЕПЛЕННЫХ СООБЩЕНИЙ ====================
  
  async pinMessage(messageId, chatId, userId) {
    return new Promise((resolve, reject) => {
      // Проверяем структуру таблицы перед выполнением запроса
      this.db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='pinned_messages'", (err, row) => {
        if (err || !row || !row.sql.includes('pinned_by')) {
          console.error('❌ pinMessage: table structure is invalid or missing');
          reject(new Error('Таблица закрепленных сообщений не готова'));
          return;
        }
        
        const sql = `
          INSERT OR REPLACE INTO pinned_messages (message_id, chat_id, pinned_by, pinned_at)
          VALUES (?, ?, ?, datetime('now'))
        `;
        const db = this.db; // Сохраняем ссылку на db
        db.run(sql, [messageId, chatId, userId], function(err) {
          if (err) {
            console.error('❌ pinMessage error:', err);
            reject(err);
          } else {
            console.log('✅ Message pinned successfully:', messageId);
            resolve(this.lastID);
          }
        });
      });
    });
  }

  async unpinMessage(messageId, chatId, userId) {
    return new Promise((resolve, reject) => {
      // Проверяем структуру таблицы перед выполнением запроса
      this.db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='pinned_messages'", (err, row) => {
        if (err || !row || !row.sql.includes('pinned_by')) {
          console.error('❌ unpinMessage: table structure is invalid or missing');
          reject(new Error('Таблица закрепленных сообщений не готова'));
          return;
        }
        
        const sql = 'DELETE FROM pinned_messages WHERE message_id = ? AND chat_id = ? AND pinned_by = ?';
        const db = this.db; // Сохраняем ссылку на db
        db.run(sql, [messageId, chatId, userId], function(err) {
          if (err) {
            console.error('❌ unpinMessage error:', err);
            reject(err);
          } else {
            console.log('✅ Message unpinned successfully:', messageId);
            resolve(this.changes);
          }
        });
      });
    });
  }

  async getPinnedMessages(chatId, userId) {
    return new Promise((resolve, reject) => {
      // Сначала проверяем, существует ли таблица и имеет ли правильную структуру
      this.db.get("SELECT sql FROM sqlite_master WHERE type='table' AND name='pinned_messages'", (err, row) => {
        if (err) {
          console.error('❌ getPinnedMessages table check error:', err);
          resolve([]); // Возвращаем пустой массив вместо ошибки
          return;
        }
        
        if (!row) {
          console.log('⚠️ pinned_messages table does not exist, returning empty array');
          resolve([]);
          return;
        }
        
        // Проверяем, есть ли колонка pinned_by
        if (!row.sql.includes('pinned_by')) {
          console.log('⚠️ pinned_messages table has old structure, returning empty array');
          resolve([]);
          return;
        }
        
        // Таблица существует и имеет правильную структуру
        const sql = `
          SELECT 
            m.*,
            u.username,
            u.avatar,
            pm.pinned_at,
            pm.pinned_by
          FROM pinned_messages pm
          JOIN messages m ON pm.message_id = m.id
          JOIN users u ON m.user_id = u.id
          WHERE pm.chat_id = ? AND pm.pinned_by = ?
          ORDER BY pm.pinned_at DESC
        `;
        
        this.db.all(sql, [chatId, userId], (err, rows) => {
          if (err) {
            console.error('❌ getPinnedMessages query error:', err);
            // Возвращаем пустой массив вместо ошибки для стабильности
            resolve([]);
          } else {
            console.log('✅ getPinnedMessages result:', rows?.length || 0, 'messages found');
            resolve(rows || []);
          }
        });
      });
    });
  }

  async isMessagePinned(messageId, chatId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT 1 FROM pinned_messages WHERE message_id = ? AND chat_id = ?';
      this.db.get(sql, [messageId, chatId], (err, row) => {
        if (err) {
          console.error('❌ isMessagePinned error:', err);
          reject(err);
        } else {
          resolve(!!row);
        }
      });
    });
  }

  // === МЕТОДЫ ДЛЯ ЗАПЛАНИРОВАННЫХ СООБЩЕНИЙ ===

  // Создать запланированное сообщение
  scheduleMessage(chatId, userId, content, messageType, fileInfo, replyToId, scheduledFor, repeatType = 'none', repeatDays = null, repeatUntil = null, timezoneOffset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO scheduled_messages (
          chat_id, user_id, content, message_type, file_info, reply_to_id, scheduled_for,
          repeat_type, repeat_days, repeat_until, is_recurring, timezone_offset
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const isRecurring = repeatType !== 'none' ? 1 : 0;
      
      this.db.run(sql, [
        chatId, userId, content, messageType, 
        fileInfo ? JSON.stringify(fileInfo) : null, 
        replyToId, scheduledFor, repeatType, repeatDays, repeatUntil, isRecurring, timezoneOffset
      ], function(err) {
        if (err) {
          console.error('❌ scheduleMessage error:', err);
          reject(err);
        } else {
          console.log('✅ Message scheduled with ID:', this.lastID, 'recurring:', isRecurring);
          resolve({ id: this.lastID });
        }
      });
    });
  }

  // Получить запланированные сообщения пользователя
  getScheduledMessages(userId, chatId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT sm.*, c.name as chat_name, c.type as chat_type
        FROM scheduled_messages sm
        JOIN chats c ON sm.chat_id = c.id
        WHERE sm.user_id = ? AND sm.status = 'pending'
      `;
      const params = [userId];
      
      if (chatId) {
        sql += ' AND sm.chat_id = ?';
        params.push(chatId);
      }
      
      sql += ' ORDER BY sm.scheduled_for ASC';
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ getScheduledMessages error:', err);
          reject(err);
        } else {
          // Парсим file_info обратно в объект
          const messages = rows.map(row => ({
            ...row,
            file_info: row.file_info ? JSON.parse(row.file_info) : null
          }));
          resolve(messages);
        }
      });
    });
  }

  // Получить сообщения готовые к отправке
  getPendingScheduledMessages() {
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      const sql = `
        SELECT sm.*, u.username, u.avatar
        FROM scheduled_messages sm
        JOIN users u ON sm.user_id = u.id
        WHERE sm.status = 'pending' AND sm.scheduled_for <= ?
        ORDER BY sm.scheduled_for ASC
      `;
      
      this.db.all(sql, [now], (err, rows) => {
        if (err) {
          console.error('❌ getPendingScheduledMessages error:', err);
          reject(err);
        } else {
          console.log(`🔍 Checking scheduled messages at ${now}, found ${rows.length} pending messages`);
          if (rows.length > 0) {
            console.log('📋 Pending messages:', rows.map(r => ({ id: r.id, scheduled_for: r.scheduled_for, content: r.content?.substring(0, 30) })));
          }
          const messages = rows.map(row => ({
            ...row,
            file_info: row.file_info ? JSON.parse(row.file_info) : null
          }));
          resolve(messages);
        }
      });
    });
  }

  // Отметить запланированное сообщение как отправленное
  markScheduledMessageAsSent(scheduledMessageId) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE scheduled_messages 
        SET status = 'sent', sent_at = datetime('now')
        WHERE id = ?
      `;
      
      this.db.run(sql, [scheduledMessageId], function(err) {
        if (err) {
          console.error('❌ markScheduledMessageAsSent error:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Удалить запланированное сообщение
  deleteScheduledMessage(scheduledMessageId, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM scheduled_messages 
        WHERE id = ? AND user_id = ? AND status = 'pending'
      `;
      
      this.db.run(sql, [scheduledMessageId, userId], function(err) {
        if (err) {
          console.error('❌ deleteScheduledMessage error:', err);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Обновить запланированное сообщение
  updateScheduledMessage(scheduledMessageId, userId, content, scheduledFor) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE scheduled_messages 
        SET content = ?, scheduled_for = ?
        WHERE id = ? AND user_id = ? AND status = 'pending'
      `;
      
      this.db.run(sql, [content, scheduledFor, scheduledMessageId, userId], function(err) {
        if (err) {
          console.error('❌ updateScheduledMessage error:', err);
          reject(err);
        } else {
          console.log('✅ Scheduled message updated:', scheduledMessageId);
          resolve({ id: scheduledMessageId, changes: this.changes });
        }
      });
    });
  }

  // Создать следующее повторение сообщения
  createNextRecurrence(scheduledMessage) {
    return new Promise((resolve, reject) => {
      const nextScheduledFor = this.calculateNextOccurrence(scheduledMessage);
      
      if (!nextScheduledFor) {
        console.log('📅 No next occurrence for message:', scheduledMessage.id);
        resolve(null);
        return;
      }

      const sql = `
        INSERT INTO scheduled_messages (
          chat_id, user_id, content, message_type, file_info, reply_to_id, scheduled_for,
          repeat_type, repeat_days, repeat_until, is_recurring, parent_recurring_id, timezone_offset
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        scheduledMessage.chat_id,
        scheduledMessage.user_id,
        scheduledMessage.content,
        scheduledMessage.message_type,
        scheduledMessage.file_info,
        scheduledMessage.reply_to_id,
        nextScheduledFor,
        scheduledMessage.repeat_type,
        scheduledMessage.repeat_days,
        scheduledMessage.repeat_until,
        1, // is_recurring
        scheduledMessage.parent_recurring_id || scheduledMessage.id,
        scheduledMessage.timezone_offset || 0
      ], function(err) {
        if (err) {
          console.error('❌ createNextRecurrence error:', err);
          reject(err);
        } else {
          console.log('✅ Next recurrence created with ID:', this.lastID);
          resolve({ id: this.lastID, scheduledFor: nextScheduledFor });
        }
      });
    });
  }

  // Вычислить следующее время повторения
  calculateNextOccurrence(scheduledMessage) {
    const { repeat_type, repeat_days, repeat_until, scheduled_for, timezone_offset = 0 } = scheduledMessage;
    
    if (repeat_type === 'none') return null;
    
    // ИСПРАВЛЕНИЕ: Правильная обработка временных зон для повторяющихся сообщений
    const currentDate = new Date(scheduled_for);
    const now = new Date();
    const untilDate = repeat_until ? new Date(repeat_until) : null;
    
    // Конвертируем UTC время в локальное время пользователя для вычислений
    const localCurrentDate = new Date(currentDate.getTime() + (timezone_offset * 60 * 60 * 1000));
    let nextLocalDate = new Date(localCurrentDate);
    
    console.log(`🕐 calculateNextOccurrence: UTC=${currentDate.toISOString()}, Local=${localCurrentDate.toISOString()}, TZ=${timezone_offset}`);
    
    switch (repeat_type) {
      case 'daily':
        nextLocalDate.setDate(nextLocalDate.getDate() + 1);
        break;
        
      case 'weekly':
        nextLocalDate.setDate(nextLocalDate.getDate() + 7);
        break;
        
      case 'weekdays': // Будние дни (Пн-Пт)
        do {
          nextLocalDate.setDate(nextLocalDate.getDate() + 1);
        } while (nextLocalDate.getDay() === 0 || nextLocalDate.getDay() === 6); // Пропускаем выходные
        break;
        
      case 'custom': // Кастомные дни недели
        if (repeat_days) {
          const days = JSON.parse(repeat_days); // [1,2,3,4,5] для Пн-Пт
          let found = false;
          let attempts = 0;
          
          while (!found && attempts < 14) { // Максимум 2 недели поиска
            nextLocalDate.setDate(nextLocalDate.getDate() + 1);
            if (days.includes(nextLocalDate.getDay())) {
              found = true;
            }
            attempts++;
          }
          
          if (!found) return null;
        }
        break;
        
      default:
        return null;
    }
    
    // Конвертируем локальное время обратно в UTC
    const nextUtcDate = new Date(nextLocalDate.getTime() - (timezone_offset * 60 * 60 * 1000));
    
    console.log(`🕐 Next occurrence: Local=${nextLocalDate.toISOString()}, UTC=${nextUtcDate.toISOString()}`);
    
    // Проверяем, не превышает ли дата окончания повторений
    if (untilDate && nextUtcDate > untilDate) {
      return null;
    }
    
    // Проверяем, что следующая дата в будущем
    if (nextUtcDate <= now) {
      return null;
    }
    
    return nextUtcDate.toISOString();
  }

  // === МЕТОДЫ ДЛЯ РЕЙТИНГА СОТРУДНИКОВ ===

  // Убедиться, что колонка stars существует
  ensureStarsColumn() {
    return new Promise((resolve, reject) => {
      console.log('🔧 Attempting to create stars column...');
      this.db.run(`ALTER TABLE users ADD COLUMN stars INTEGER DEFAULT 0`, (err) => {
        // Игнорируем ошибку если колонка уже существует
        if (err && !err.message.includes('duplicate column name')) {
          console.error('❌ Error adding stars column:', err);
          reject(err);
        } else {
          if (err) {
            console.log('✅ Stars column already exists');
          } else {
            console.log('✅ Stars column created successfully');
          }
          resolve();
        }
      });
    });
  }

  // Получить всех сотрудников с их рейтингом
  getAllEmployeesWithRating() {
    return new Promise((resolve, reject) => {
      console.log('🔍 Starting getAllEmployeesWithRating...');
      // Сначала убедимся, что колонка stars существует и таблица видимости создана
      Promise.all([
        this.ensureStarsColumn(),
        this.createDepartmentVisibilityTable()
      ]).then(() => {
        console.log('🔍 Stars column ensured, executing SQL...');
        const sql = `
          SELECT 
            u.id,
            u.username,
            u.department,
            u.avatar as avatarUrl,
            COALESCE(u.stars, 0) as stars,
            u.role
          FROM users u
          ORDER BY u.department, COALESCE(u.stars, 0) DESC
        `;
        
        this.db.all(sql, [], (err, rows) => {
          if (err) {
            console.error('❌ getAllEmployeesWithRating error:', err);
            reject(err);
          } else {
            console.log('✅ Retrieved employees with rating:', rows.length);
            
            // Возвращаем данные как есть
            console.log('✅ Returning existing data');
            resolve(rows);
          }
        });
      }).catch(reject);
    });
  }

  // Создать тестовых сотрудников для демонстрации
  createTestEmployees() {
    return new Promise((resolve, reject) => {
      const testEmployees = [
        { username: 'Анна Иванова', department: 'Колл-центр', stars: 3, role: 'user' },
        { username: 'Петр Петров', department: 'Колл-центр', stars: 5, role: 'user' },
        { username: 'Светлана Кузнецова', department: 'Колл-центр', stars: 4, role: 'user' },
        { username: 'Мария Сидорова', department: 'Склад', stars: 2, role: 'user' },
        { username: 'Иван Козлов', department: 'Склад', stars: 4, role: 'user' },
        { username: 'Алексей Морозов', department: 'Склад', stars: 1, role: 'user' },
        { username: 'Елена Николаева', department: 'Отдел возвратов', stars: 1, role: 'user' },
        { username: 'Дмитрий Смирнов', department: 'Отдел возвратов', stars: 3, role: 'user' },
        { username: 'Ольга Васильева', department: 'Отдел возвратов', stars: 5, role: 'user' }
      ];

      let completed = 0;
      const total = testEmployees.length;

      testEmployees.forEach(emp => {
        // Сначала проверяем, существует ли пользователь
        this.db.get(`SELECT id FROM users WHERE username = ?`, [emp.username], (err, row) => {
          if (err) {
            console.error('❌ Error checking employee:', err);
            completed++;
            if (completed === total) resolve();
            return;
          }

          if (row) {
            // Пользователь существует, обновляем его
            const sql = `UPDATE users SET department = ?, stars = ? WHERE username = ?`;
            this.db.run(sql, [emp.department, emp.stars, emp.username], (updateErr) => {
              if (updateErr) {
                console.error('❌ Error updating test employee:', updateErr);
              } else {
                console.log(`✅ Updated employee: ${emp.username}`);
              }
              completed++;
              if (completed === total) resolve();
            });
          } else {
            // Пользователь не существует, создаем его с паролем по умолчанию
            const defaultPassword = '$2b$10$defaultHashForTestUsers'; // Хеш для пароля "test123"
            const sql = `INSERT INTO users (username, password, department, stars, role) VALUES (?, ?, ?, ?, ?)`;
            this.db.run(sql, [emp.username, defaultPassword, emp.department, emp.stars, emp.role], (insertErr) => {
              if (insertErr) {
                console.error('❌ Error creating test employee:', insertErr);
              } else {
                console.log(`✅ Created employee: ${emp.username}`);
              }
              completed++;
              if (completed === total) resolve();
            });
          }
        });
      });

      if (total === 0) resolve();
    });
  }

  // Создать таблицу настроек видимости отделов
  createDepartmentVisibilityTable() {
    return new Promise((resolve, reject) => {
      const sql = `
        CREATE TABLE IF NOT EXISTS department_visibility (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          department_id TEXT NOT NULL UNIQUE,
          is_hidden INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      this.db.run(sql, (err) => {
        if (err) {
          console.error('❌ Error creating department_visibility table:', err);
          reject(err);
        } else {
          console.log('✅ Department visibility table created/verified');
          resolve();
        }
      });
    });
  }

  // Получить настройки видимости отделов
  getDepartmentVisibilitySettings() {
    return new Promise((resolve, reject) => {
      const sql = `SELECT department_id, is_hidden FROM department_visibility`;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error getting department visibility:', err);
          reject(err);
        } else {
          const settings = {};
          rows.forEach(row => {
            settings[row.department_id] = row.is_hidden === 1;
          });
          resolve(settings);
        }
      });
    });
  }

  // Обновить видимость отдела
  updateDepartmentVisibility(departmentId, isHidden) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO department_visibility (department_id, is_hidden, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `;
      
      this.db.run(sql, [departmentId, isHidden ? 1 : 0], function(err) {
        if (err) {
          console.error('❌ Error updating department visibility:', err);
          reject(err);
        } else {
          console.log('✅ Updated department visibility:', departmentId, 'hidden:', isHidden);
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  // Обновить рейтинг сотрудника
  updateEmployeeRating(employeeId, stars) {
    return new Promise((resolve, reject) => {
      // Приводим к числу для безопасности
      const numericEmployeeId = parseInt(employeeId, 10);
      const numericStars = parseInt(stars, 10);
      
      console.log('🔧 updateEmployeeRating called:', { 
        originalEmployeeId: employeeId, 
        numericEmployeeId, 
        originalStars: stars, 
        numericStars 
      });
      
      // Сначала добавляем колонку stars если её нет
      this.db.run(`ALTER TABLE users ADD COLUMN stars INTEGER DEFAULT 0`, (alterErr) => {
        // Игнорируем ошибку если колонка уже существует
        
        const sql = `UPDATE users SET stars = ? WHERE id = ?`;
        
        this.db.run(sql, [numericStars, numericEmployeeId], function(err) {
          if (err) {
            console.error('❌ updateEmployeeRating error:', err);
            reject(err);
          } else {
            console.log('✅ Updated employee rating:', numericEmployeeId, 'stars:', numericStars, 'changes:', this.changes);
            if (this.changes === 0) {
              console.log('⚠️ No rows were updated! Employee ID might not exist:', numericEmployeeId);
            }
            resolve({ success: true, changes: this.changes });
          }
        });
      });
    });
  }

  // Получить топ сотрудников по отделам
  getTopEmployeesByDepartment() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          u.department,
          u.id,
          u.username,
          u.avatar_url as avatarUrl,
          COALESCE(u.stars, 0) as stars,
          ROW_NUMBER() OVER (PARTITION BY u.department ORDER BY COALESCE(u.stars, 0) DESC) as rank
        FROM users u
        WHERE u.department IS NOT NULL AND u.department != ''
        ORDER BY u.department, COALESCE(u.stars, 0) DESC
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ getTopEmployeesByDepartment error:', err);
          reject(err);
        } else {
          // Группируем по отделам и берем только топ-1 из каждого
          const topEmployees = {};
          rows.forEach(row => {
            if (row.rank === 1) {
              topEmployees[row.department] = row;
            }
          });
          
          console.log('✅ Retrieved top employees by department:', Object.keys(topEmployees).length);
          resolve(topEmployees);
        }
      });
    });
  }

  // Получить историю изменений рейтинга
  getRatingHistory(employeeId = null) {
    return new Promise((resolve, reject) => {
      let sql = `
        SELECT 
          rh.*,
          u.username as employee_name,
          hr.username as hr_name
        FROM rating_history rh
        LEFT JOIN users u ON rh.employee_id = u.id
        LEFT JOIN users hr ON rh.hr_id = hr.id
      `;
      
      let params = [];
      if (employeeId) {
        sql += ` WHERE rh.employee_id = ?`;
        params.push(employeeId);
      }
      
      sql += ` ORDER BY rh.created_at DESC LIMIT 100`;
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ getRatingHistory error:', err);
          reject(err);
        } else {
          console.log('✅ Retrieved rating history:', rows.length);
          resolve(rows);
        }
      });
    });
  }

  // Добавить запись в историю рейтинга
  addRatingHistory(employeeId, hrId, oldStars, newStars, reason = null) {
    return new Promise((resolve, reject) => {
      // Сначала создаем таблицу если её нет
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS rating_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          employee_id INTEGER NOT NULL,
          hr_id INTEGER NOT NULL,
          old_stars INTEGER DEFAULT 0,
          new_stars INTEGER DEFAULT 0,
          reason TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (employee_id) REFERENCES users(id),
          FOREIGN KEY (hr_id) REFERENCES users(id)
        )
      `;
      
      this.db.run(createTableSql, (createErr) => {
        if (createErr) {
          console.error('❌ Error creating rating_history table:', createErr);
        }
        
        const sql = `
          INSERT INTO rating_history (employee_id, hr_id, old_stars, new_stars, reason)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        this.db.run(sql, [employeeId, hrId, oldStars, newStars, reason], function(err) {
          if (err) {
            console.error('❌ addRatingHistory error:', err);
            reject(err);
          } else {
            console.log('✅ Added rating history record:', this.lastID);
            resolve({ id: this.lastID });
          }
        });
      });
    });
  }

  // Сохранить пароль локального пользователя Windows
  async saveLocalUserPassword(username, password) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO local_user_passwords (username, password, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [username, password],
        function(err) {
          if (err) {
            console.error('❌ saveLocalUserPassword error:', err);
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Получить пароль локального пользователя Windows
  async getLocalUserPassword(username) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT password FROM local_user_passwords WHERE username = ?',
        [username],
        (err, row) => {
          if (err) {
            console.error('❌ getLocalUserPassword error:', err);
            reject(err);
          } else {
            resolve(row ? row.password : null);
          }
        }
      );
    });
  }

  // Получить все пароли локальных пользователей
  async getAllLocalUserPasswords() {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT username, password FROM local_user_passwords',
        [],
        (err, rows) => {
          if (err) {
            console.error('❌ getAllLocalUserPasswords error:', err);
            reject(err);
          } else {
            const passwordsMap = {};
            (rows || []).forEach(row => {
              passwordsMap[row.username] = row.password;
            });
            resolve(passwordsMap);
          }
        }
      );
    });
  }
}

module.exports = new Database();
