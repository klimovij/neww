class MessengerApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null; // Изменено с currentChatId на currentChat для хранения полной информации
        this.typingTimer = null;
        this.replyToMessage = null;
        this.sounds = {
            message: null,
            file: null
        };
        this.clockIntervalId = null;
        
        this.init();
    }

    init() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        
        if (!token || !user) {
            window.location.href = 'login.html';
            return;
        }

        this.currentUser = JSON.parse(user);
        this.initSounds();
        this.setupSocket(token);
        this.setupEventListeners();
        this.updateUI();
        this.startClock();
    }

    initSounds() {
        // Создаем звуки программно
        this.sounds.message = this.createSound(800, 0.1, 'sine'); // Обычное сообщение
        this.sounds.file = this.createSound(600, 0.15, 'square'); // Файл
    }

    createSound(frequency, duration, type = 'sine') {
        return () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = type;
                
                gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + duration);
            } catch (error) {
                console.log('Audio not supported');
            }
        };
    }

    setupSocket(token) {
        this.socket = io('http://localhost:3000');
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.socket.emit('authenticate', token);
        });

        this.socket.on('authenticated', (data) => {
            console.log('Authenticated:', data);
        });

        this.socket.on('auth_error', (error) => {
            console.error('Auth error:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });

        this.socket.on('chats', (chats) => {
            this.renderChats(chats);
        });

        this.socket.on('chat_messages', (data) => {
            if (data.chatId == this.currentChat?.id) {
                this.renderMessages(data.messages);
                // Отмечаем сообщения как прочитанные
                this.socket.emit('mark_chat_read', this.currentChat.id);
            }
        });

        this.socket.on('new_message', (message) => {
            if (message.chat_id == this.currentChat?.id) {
                this.addMessage(message);
                // Отмечаем сообщение как прочитанное если чат активен
                this.socket.emit('mark_message_read', message.id);
            } else {
                // Обновляем счетчик непрочитанных сообщений
                this.updateChatUnreadCount(message.chat_id);
            }
            
            // Воспроизводим звук если сообщение не от текущего пользователя
            if (message.user_id !== this.currentUser.id) {
                if (message.message_type === 'file') {
                    this.sounds.file();
                } else {
                    this.sounds.message();
                }
            }
        });

        this.socket.on('chats_updated', (chats) => {
            this.renderChats(chats);
        });

        this.socket.on('online_users', (users) => {
            this.renderOnlineUsers(users);
        });

        this.socket.on('user_typing', (data) => {
            if (data.chatId == this.currentChat?.id) {
                this.showTypingIndicator(data.username);
            }
        });

        this.socket.on('user_stop_typing', (data) => {
            if (data.chatId == this.currentChat?.id) {
                this.hideTypingIndicator();
            }
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showNotification('Произошла ошибка: ' + error, 'error');
        });
        
        // Обработчики для работы с пользователями и чатами
        this.socket.on('all_users', (users) => {
            this.showUserSelectionModal(users);
        });
        
        this.socket.on('private_chat_created', (data) => {
            this.showNotification(`Приватный чат "${data.chatName}" создан!`, 'success');
            this.selectChat(data.chatId, data.chatName);
        });
        
        this.socket.on('chat_exists', (chat) => {
            this.showNotification('Чат с этим пользователем уже существует', 'info');
            this.selectChat(chat.id, chat.name);
        });
        
        this.socket.on('new_chat_created', (chat) => {
            // Обновляем список чатов когда нас добавили в новый чат
            this.socket.emit('get_chats');
        });
        
        this.socket.on('user_added_to_chat', (data) => {
            this.showNotification(`Пользователь ${data.username} добавлен в чат`, 'success');
        });
        
        this.socket.on('chat_participants', (data) => {
            this.showChatParticipants(data.chatId, data.participants);
        });

        // Обработчики лайков
        this.socket.on('message_liked', (data) => {
            this.updateMessageLikes(data.messageId, data.likesCount, data.likes, true);
        });

        this.socket.on('message_unliked', (data) => {
            this.updateMessageLikes(data.messageId, data.likesCount, data.likes, false);
        });

        this.socket.on('message_likes_list', (data) => {
            this.showLikesList(data.messageId, data.likes);
        });

        // Обработчики удаления чатов
        this.socket.on('chat_deleted', (data) => this.handleChatDeleted(data));
        this.socket.on('chat_delete_error', (error) => this.handleChatDeleteError(error));
    }

    setupEventListeners() {
        // Кнопка выхода
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });

        // Создание чата
        document.getElementById('createChatBtn').addEventListener('click', () => {
            document.getElementById('createChatModal').style.display = 'block';
        });

        // Закрытие модальных окон
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Подтверждение создания чата
        document.getElementById('confirmCreateChat').addEventListener('click', () => {
            const chatName = document.getElementById('chatNameInput').value.trim();
            if (chatName) {
                this.socket.emit('create_chat', { name: chatName, type: 'group' });
                document.getElementById('createChatModal').style.display = 'none';
                document.getElementById('chatNameInput').value = '';
            }
        });

        // Отправка сообщения
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        // Кнопка прикрепления файла
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // Кнопка смайликов
        document.getElementById('emojiBtn').addEventListener('click', () => {
            this.toggleEmojiPicker();
        });

        // Загрузка файла
        document.getElementById('fileInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileUpload(e.target.files[0]);
            }
        });

        // Ввод сообщения
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            } else {
                this.handleTyping();
            }
        });

        // Глобальные обработчики кликов
        document.addEventListener('click', (e) => {
            // Закрытие ответа
            if (e.target.classList.contains('close-reply')) {
                this.cancelReply();
            }
            
            // Кнопки управления чатом
            if (e.target.classList.contains('add-users-btn')) {
                this.showAddUsersModal();
            }
            
            if (e.target.classList.contains('chat-info-btn')) {
                this.showChatInfo();
            }
        });

        // Закрытие модальных окон и панелей при клике вне их
        window.addEventListener('click', (e) => {
            // Закрытие модальных окон
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
            
            // Закрытие панели смайликов
            const emojiPicker = document.getElementById('emojiPicker');
            if (!e.target.closest('.emoji-picker') && !e.target.closest('.emoji-btn')) {
                emojiPicker.style.display = 'none';
            }
        });
    }

    updateUI() {
        document.getElementById('currentUser').textContent = this.currentUser.username;
    }

    // Часы реального времени
    startClock() {
        const sidebarClock = document.getElementById('currentTime');
        const headerClock = document.getElementById('currentTimeHeader');
        if (!sidebarClock && !headerClock) return;

        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            if (sidebarClock) sidebarClock.textContent = timeStr;
            if (headerClock) {
                headerClock.textContent = timeStr;
                headerClock.style.display = 'block';
            }
        };
        update();
        this.clockIntervalId = setInterval(update, 1000);
    }

    stopClock() {
        if (this.clockIntervalId) {
            clearInterval(this.clockIntervalId);
            this.clockIntervalId = null;
        }
    }

    renderChats(chats) {
        const chatsList = document.getElementById('chatsList');
        chatsList.innerHTML = '';

        chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chat.id;
            
            const unreadBadge = chat.unread_count > 0 ? 
                `<span class="unread-badge">${chat.unread_count}</span>` : '';
            
            const lastMessage = chat.last_message ? 
                `<div class="last-message">${chat.last_message.substring(0, 30)}${chat.last_message.length > 30 ? '...' : ''}</div>` : '';
            
            chatElement.innerHTML = `
                <div class="chat-info">
                    <div class="chat-name">${chat.name || 'Приватный чат'} ${unreadBadge}</div>
                    <div class="chat-type">${chat.type === 'group' ? 'Группа' : 'Приватный'}</div>
                    ${lastMessage}
                </div>
            `;
            
            chatElement.addEventListener('click', () => {
                this.selectChat(chat.id, chat.name, chat.type);
            });
            
            chatsList.appendChild(chatElement);
        });
    }

    selectChat(chatId, chatName, chatType = 'group') {
        this.currentChat = { id: chatId, name: chatName, type: chatType };
        
        document.getElementById('chatHeader').innerHTML = `
            <div class="chat-header-content">
                <h3 id="chatTitle">${chatName}</h3>
                <div class="chat-actions" id="chatActions">
                    <button class="chat-info-btn" onclick="app.showChatInfo()" title="Информация о чате">ℹ️</button>
                    <button class="add-users-btn" onclick="app.showAddUsersModal()" title="Добавить пользователей">👥+</button>
                    <button class="delete-chat-btn" onclick="app.showDeleteChatModal()" title="Удалить чат">🗑️</button>
                </div>
            </div>
        `;
        
        document.getElementById('messageInputContainer').style.display = 'flex';
        
        this.socket.emit('join_chat', chatId);
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const selectedChat = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (selectedChat) {
            selectedChat.classList.add('active');
            const badge = selectedChat.querySelector('.unread-badge');
            if (badge) {
                badge.remove();
            }
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        messages.forEach(message => {
            this.addMessage(message);
        });

        this.scrollToBottom();
    }

    addMessage(message) {
        const container = document.getElementById('messagesContainer');
        const messageElement = document.createElement('div');
        
        // Обработка системных сообщений
        if (message.message_type === 'system') {
            messageElement.className = 'message system';
            messageElement.innerHTML = `<div class="message-content">${message.content}</div>`;
            container.appendChild(messageElement);
            this.scrollToBottom();
            return;
        }
        
        messageElement.className = `message ${message.user_id === this.currentUser.id ? 'own' : 'other'}`;
        messageElement.dataset.messageId = message.id;
        
        const time = new Date(message.created_at).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    
        let messageContent = '';
        
        // Если это ответ на сообщение
        if (message.reply_to_id && message.reply_content) {
            messageContent += `
                <div class="reply-info">
                    <div class="reply-author">${message.reply_username}</div>
                    <div class="reply-content">${this.escapeHtml(message.reply_content)}</div>
                </div>
            `;
        }
    
        // Основное содержимое сообщения
        if (message.message_type === 'file' && message.file_info) {
            const fileInfo = JSON.parse(message.file_info);
            messageContent += this.renderFileMessage(fileInfo, message.content);
        } else {
            // Обрабатываем эмодзи в тексте сообщения
            const processedContent = this.processEmojiContent(message.content);
            messageContent += `<div class="message-text ${processedContent.isEmojiOnly ? 'emoji-only' : ''}">${processedContent.content}</div>`;
        }
    
        // Статус прочитанности (только для собственных сообщений)
        const readStatus = message.user_id === this.currentUser.id ? 
            '<span class="read-status">✓</span>' : '';
    
        // Лайки
        const likesCount = message.likes_count || 0;
        const userLiked = message.user_liked > 0;
        const likeButtonClass = userLiked ? 'like-btn liked' : 'like-btn';
        const likeIcon = userLiked ? '❤️' : '🤍';
    
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="username">${message.username}</span>
                <span class="time">${time} ${readStatus}</span>
                <div class="message-actions">
                    <button class="reply-btn" onclick="app.replyToMessage(${message.id}, '${message.username}', '${this.escapeHtml(message.content).replace(/'/g, "\\'")}')">↩️</button>
                </div>
            </div>
            <div class="message-content">
                ${messageContent}
            </div>
            <div class="message-footer">
                <div class="likes-section">
                    <button class="${likeButtonClass}" onclick="app.toggleLike(${message.id})" data-message-id="${message.id}">
                        ${likeIcon}
                    </button>
                    <span class="likes-count" onclick="app.showMessageLikes(${message.id})" data-message-id="${message.id}">
                        ${likesCount > 0 ? likesCount : ''}
                    </span>
                </div>
            </div>
        `;
    
        container.appendChild(messageElement);
        this.scrollToBottom();
    }

    // Новая функция для обработки эмодзи в контенте
    processEmojiContent(content) {
        if (!content) return { content: '', isEmojiOnly: false };
        
        // Расширенное регулярное выражение для эмодзи
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji_Modifier_Sequence}|\p{Emoji_Flag_Sequence}|\p{Emoji_Tag_Sequence}|\p{Emoji_ZWJ_Sequence})/gu;
        
        // Проверяем, состоит ли сообщение только из эмодзи и пробелов
        const textWithoutSpaces = content.replace(/\s/g, '');
        const onlyEmojis = textWithoutSpaces.match(emojiRegex);
        const isEmojiOnly = onlyEmojis && onlyEmojis.join('') === textWithoutSpaces;
        
        // Обрабатываем текст с эмодзи
        let processedContent = this.parseEmojis(this.escapeHtml(content));
        
        // Оборачиваем эмодзи в span с классом для стилизации
        processedContent = processedContent.replace(emojiRegex, '<span class="emoji">$1</span>');
        
        return { content: processedContent, isEmojiOnly };
    }
    
    // Методы для работы с лайками:
    toggleLike(messageId) {
        const likeBtn = document.querySelector(`[data-message-id="${messageId}"].like-btn`);
        const isLiked = likeBtn.classList.contains('liked');
        
        if (isLiked) {
            this.socket.emit('unlike_message', { messageId });
        } else {
            this.socket.emit('like_message', { messageId });
        }
    }

    updateMessageLikes(messageId, likesCount, likes, isLiked) {
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) return;
        
        const likeBtn = messageElement.querySelector('.like-btn');
        const likesCountSpan = messageElement.querySelector('.likes-count');
        
        if (likeBtn) {
            // Проверяем, лайкнул ли текущий пользователь
            const userLiked = likes.some(like => like.user_id === this.currentUser.id);
            
            if (userLiked) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = '❤️';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = '🤍';
            }
        }
        
        if (likesCountSpan) {
            likesCountSpan.textContent = likesCount > 0 ? likesCount : '';
        }
    }

    showMessageLikes(messageId) {
        this.socket.emit('get_message_likes', messageId);
    }

    showLikesList(messageId, likes) {
        if (likes.length === 0) {
            this.showNotification('Пока никто не поставил лайк этому сообщению', 'info');
            return;
        }
        
        const modal = document.getElementById('likesModal');
        const likesList = document.getElementById('likesList');
        
        likesList.innerHTML = '';
        
        likes.forEach(like => {
            const likeElement = document.createElement('div');
            likeElement.className = 'like-item';
            likeElement.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar"></div>
                    <span class="username">${like.username}</span>
                </div>
                <span class="like-icon">❤️</span>
            `;
            likesList.appendChild(likeElement);
        });
        
        modal.style.display = 'block';
    }

    // Методы для удаления чатов
    showDeleteChatModal() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для удаления', 'error');
            return;
        }
        
        const modal = document.getElementById('deleteChatModal');
        const message = document.getElementById('deleteChatMessage');
        const confirmBtn = document.getElementById('confirmDeleteChat');
        
        // Обновляем текст в зависимости от типа чата
        if (this.currentChat.type === 'private') {
            message.textContent = `Вы уверены, что хотите удалить переписку с ${this.currentChat.name}? Все сообщения будут удалены.`;
        } else {
            message.textContent = `Вы уверены, что хотите удалить ${this.currentChat.type === 'group' ? 'группу' : 'канал'} "${this.currentChat.name}"? Все сообщения будут удалены.`;
        }
        
        // Обработчик подтверждения удаления
        confirmBtn.onclick = () => {
            this.deleteChat(this.currentChat.id);
            modal.style.display = 'none';
        };
        
        modal.style.display = 'block';
    }

    deleteChat(chatId) {
        if (!this.socket || !chatId) {
            this.showNotification('Ошибка удаления чата', 'error');
            return;
        }
        
        console.log('🗑️ Deleting chat:', chatId);
        
        // Отправляем запрос на удаление чата
        this.socket.emit('delete_chat', { chatId });
    }

    handleChatDeleted(data) {
        console.log('✅ Chat deleted:', data);
        
        const { chatId, chatName } = data;
        
        // Удаляем чат из списка
        const chatElement = document.querySelector(`[data-chat-id="${chatId}"]`);
        if (chatElement) {
            // Добавляем анимацию удаления
            chatElement.classList.add('deleting');
            
            setTimeout(() => {
                chatElement.remove();
            }, 300);
        }
        
        // Если удаленный чат был активным, очищаем область чата
        if (this.currentChat && this.currentChat.id === chatId) {
            this.currentChat = null;
            this.clearChatArea();
        }
        
        this.showNotification(`Чат "${chatName}" успешно удален`, 'success');
    }

    handleChatDeleteError(error) {
        console.error('❌ Chat delete error:', error);
        this.showNotification(error.message || 'Ошибка удаления чата', 'error');
    }

    clearChatArea() {
        const messagesContainer = document.getElementById('messagesContainer');
        const chatActions = document.getElementById('chatActions');
        const messageInputContainer = document.getElementById('messageInputContainer');
        
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <h2>Добро пожаловать в мессенджер!</h2>
                <p>Выберите чат из списка слева или создайте новый</p>
            </div>
        `;
        
        document.getElementById('chatTitle').textContent = 'Выберите чат';
        if (chatActions) chatActions.style.display = 'none';
        messageInputContainer.style.display = 'none';
    }

    // Система уведомлений
    showNotification(message, type = 'info') {
        // Создаем элемент уведомления
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            word-wrap: break-word;
            animation: slideInRight 0.3s ease;
        `;
        
        // Цвета в зависимости от типа
        switch (type) {
            case 'success':
                notification.style.background = '#2ecc71';
                break;
            case 'error':
                notification.style.background = '#e74c3c';
                break;
            case 'warning':
                notification.style.background = '#f39c12';
                break;
            default:
                notification.style.background = '#3498db';
        }
        
        document.body.appendChild(notification);
        
        // Удаляем через 3 секунды
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    renderFileMessage(fileInfo, caption) {
        const isImage = fileInfo.mimetype.startsWith('image/');
        
        if (isImage) {
            return `
                <div class="file-message image-message">
                    <img src="${fileInfo.url}" alt="${fileInfo.originalName}" onclick="this.requestFullscreen()" loading="lazy">
                    ${caption ? `<div class="file-caption">${this.processEmojiContent(caption).content}</div>` : ''}
                </div>
            `;
        } else {
            const fileIcon = this.getFileIcon(fileInfo.mimetype);
            const fileSize = this.formatFileSize(fileInfo.size);
            
            return `
                <div class="file-message document-message">
                    <div class="file-info">
                        <div class="file-icon">${fileIcon}</div>
                        <div class="file-details">
                            <div class="file-name">${fileInfo.originalName}</div>
                            <div class="file-size">${fileSize}</div>
                        </div>
                        <a href="${fileInfo.url}" download="${fileInfo.originalName}" class="download-btn">⬇️</a>
                    </div>
                    ${caption ? `<div class="file-caption">${this.processEmojiContent(caption).content}</div>` : ''}
                </div>
            `;
        }
    }

    getFileIcon(mimetype) {
        if (mimetype.includes('pdf')) return '📄';
        if (mimetype.includes('word')) return '📝';
        if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return '📊';
        if (mimetype.includes('zip') || mimetype.includes('rar')) return '🗜️';
        return '📎';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async handleFileUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                const fileInfo = await response.json();
                this.showFilePreview(fileInfo);
            } else {
                const error = await response.json();
                this.showNotification('Ошибка загрузки файла: ' + error.error, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showNotification('Ошибка загрузки файла', 'error');
        }
    }

    showFilePreview(fileInfo) {
        const previewContainer = document.getElementById('filePreview');
        const isImage = fileInfo.mimetype.startsWith('image/');
        
        let previewContent = '';
        if (isImage) {
            previewContent = `<img src="${fileInfo.url}" alt="${fileInfo.originalName}" style="max-width: 200px; max-height: 200px;">`;
        } else {
            const fileIcon = this.getFileIcon(fileInfo.mimetype);
            previewContent = `
                <div class="file-preview-info">
                    <span class="file-icon">${fileIcon}</span>
                    <span class="file-name">${fileInfo.originalName}</span>
                </div>
            `;
        }
        
        previewContainer.innerHTML = `
            <div class="file-preview-content">
                ${previewContent}
                <button class="remove-file" onclick="app.removeFilePreview()">✕</button>
            </div>
        `;
        previewContainer.style.display = 'block';
        previewContainer.dataset.fileInfo = JSON.stringify(fileInfo);
        
        document.getElementById('messageInput').placeholder = 'Добавьте подпись к файлу...';
    }

    removeFilePreview() {
        const previewContainer = document.getElementById('filePreview');
        previewContainer.style.display = 'none';
        previewContainer.innerHTML = '';
        delete previewContainer.dataset.fileInfo;
        document.getElementById('messageInput').placeholder = 'Введите сообщение...';
    }

    sendMessage() {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        const previewContainer = document.getElementById('filePreview');
        const fileInfo = previewContainer.dataset.fileInfo ? JSON.parse(previewContainer.dataset.fileInfo) : null;
        
        if ((content || fileInfo) && this.currentChat) {
            const messageData = {
                chatId: this.currentChat.id,
                content: content || '',
                messageType: fileInfo ? 'file' : 'text',
                fileInfo: fileInfo,
                replyToId: this.replyToMessage ? this.replyToMessage.id : null
            };
            
            this.socket.emit('send_message', messageData);
            
            input.value = '';
            this.removeFilePreview();
            this.cancelReply();
            this.socket.emit('stop_typing', { chatId: this.currentChat.id });
        }
    }

    replyToMessage(messageId, username, content) {
        this.replyToMessage = { id: messageId, username, content };
        
        const replyContainer = document.getElementById('replyContainer');
        replyContainer.innerHTML = `
            <div class="reply-preview">
                <div class="reply-info">
                    <strong>Ответ для ${username}:</strong>
                    <span>${content.substring(0, 50)}${content.length > 50 ? '...' : ''}</span>
                </div>
                <button class="close-reply">✕</button>
            </div>
        `;
        replyContainer.style.display = 'block';
        
        document.getElementById('messageInput').focus();
    }

    cancelReply() {
        this.replyToMessage = null;
        document.getElementById('replyContainer').style.display = 'none';
    }

    toggleEmojiPicker() {
        const emojiPicker = document.getElementById('emojiPicker');
        emojiPicker.style.display = emojiPicker.style.display === 'block' ? 'none' : 'block';
    }

    insertEmoji(emoji) {
        const input = document.getElementById('messageInput');
        const cursorPos = input.selectionStart;
        const textBefore = input.value.substring(0, cursorPos);
        const textAfter = input.value.substring(cursorPos);
        
        input.value = textBefore + emoji + textAfter;
        input.setSelectionRange(cursorPos + emoji.length, cursorPos + emoji.length);
        input.focus();
        
        this.toggleEmojiPicker();
    }

    parseEmojis(text) {
        const emojiMap = {
            ':)': '😊',
            ':D': '😃',
            ':(': '😢',
            ':P': '😛',
            ';)': '😉',
            '<3': '❤️',
            ':thumbsup:': '👍',
            ':thumbsdown:': '👎',
            ':fire:': '🔥',
            ':star:': '⭐'
        };
        
        let result = text;
        for (const [key, emoji] of Object.entries(emojiMap)) {
            result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), emoji);
        }
        
        return result;
    }

    updateChatUnreadCount(chatId) {
        // Запрашиваем обновленный список чатов
        this.socket.emit('get_chats');
    }

    handleTyping() {
        if (this.currentChat) {
            this.socket.emit('typing', { chatId: this.currentChat.id });
            
            clearTimeout(this.typingTimer);
            this.typingTimer = setTimeout(() => {
                this.socket.emit('stop_typing', { chatId: this.currentChat.id });
            }, 1000);
        }
    }

    showTypingIndicator(username) {
        const indicator = document.getElementById('typingIndicator');
        indicator.textContent = `${username} печатает...`;
        indicator.style.display = 'block';
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        indicator.style.display = 'none';
    }

    renderOnlineUsers(users) {
        const container = document.getElementById('onlineUsersList');
        container.innerHTML = '';

        users.forEach(user => {
            if (user.id !== this.currentUser.id) {
                const userElement = document.createElement('div');
                userElement.className = 'online-user';
                userElement.innerHTML = `
                    <div class="user-avatar online"></div>
                    <span class="username">${user.username}</span>
                    <button class="write-btn" onclick="app.createPrivateChat(${user.id})" title="Написать">✉️</button>
                `;
                container.appendChild(userElement);
            }
        });
    }

    scrollToBottom() {
        const container = document.getElementById('messagesContainer');
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Методы для работы с пользователями и чатами
    showAddUsersModal() {
        if (!this.currentChat) {
            this.showNotification('Сначала выберите чат', 'warning');
            return;
        }
        
        this.socket.emit('get_all_users');
    }
    
    showUserSelectionModal(users) {
        const modal = document.getElementById('userSelectionModal');
        const usersList = document.getElementById('usersList');
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar ${user.online ? 'online' : 'offline'}"></div>
                    <span class="username">${user.username}</span>
                    <span class="user-status">${user.online ? 'В сети' : 'Не в сети'}</span>
                </div>
                <div class="user-actions">
                    <button onclick="app.createPrivateChat(${user.id})" class="btn-primary">Написать</button>
                    <button onclick="app.addUserToCurrentChat(${user.id})" class="btn-secondary">Добавить в чат</button>
                </div>
            `;
            
            usersList.appendChild(userElement);
        });
        
        modal.style.display = 'block';
    }
    
    createPrivateChat(userId) {
        this.socket.emit('create_private_chat', { targetUserId: userId });
        document.getElementById('userSelectionModal').style.display = 'none';
    }
    
    addUserToCurrentChat(userId) {
        if (!this.currentChat) {
            this.showNotification('Сначала выберите чат', 'warning');
            return;
        }
        
        this.socket.emit('add_user_to_chat', { 
            chatId: this.currentChat.id, 
            userId: userId 
        });
        document.getElementById('userSelectionModal').style.display = 'none';
    }
    
    showChatInfo() {
        if (!this.currentChat) return;
        
        this.socket.emit('get_chat_participants', this.currentChat.id);
    }
    
    showChatParticipants(chatId, participants) {
        const modal = document.getElementById('chatInfoModal');
        const participantsList = document.getElementById('participantsList');
        
        participantsList.innerHTML = '';
        
        participants.forEach(participant => {
            const participantElement = document.createElement('div');
            participantElement.className = 'participant-item';
            participantElement.innerHTML = `
                <div class="user-info">
                    <div class="user-avatar ${participant.online ? 'online' : 'offline'}"></div>
                    <div class="user-details">
                        <span class="username">${participant.username}</span>
                        <span class="join-date">Присоединился: ${new Date(participant.joined_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <span class="user-status">${participant.online ? 'В сети' : 'Не в сети'}</span>
            `;
            
            participantsList.appendChild(participantElement);
        });
        
        modal.style.display = 'block';
    }
}

// Добавляем CSS анимации для уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Глобальная переменная для доступа к методам из HTML
let app;

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    app = new MessengerApp();
});