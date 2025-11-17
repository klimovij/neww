import React, { useEffect, useRef, useCallback, useState } from 'react';
import { playNotificationSound } from '../utils/notificationSound';
import io from 'socket.io-client';
import { useApp } from '../context/AppContext';

function NewsToast({ news, onClose }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // Воспроизведение звука при появлении
    const audio = new window.Audio('/news.mp3');
    audio.volume = 0.7;
    audio.play().catch(()=>{});
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 400); // плавное исчезновение
    }, 7000);
    return () => clearTimeout(timer);
  }, [onClose]);
  if (!visible) return null;
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent('show-news'));
    if (typeof window.openNewsFeed === 'function') window.openNewsFeed();
    setVisible(false);
    setTimeout(onClose, 400);
  };
  return (
    <div style={{
      position: 'fixed',
      top: 32,
      right: 32,
      zIndex: 9999,
      minWidth: 320,
      maxWidth: 420,
      background: 'linear-gradient(135deg,#fcb69f 0%,#ffecd2 100%)',
      color: '#222',
      boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
      borderRadius: 18,
      padding: '22px 32px 22px 28px',
      fontSize: '1.13em',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 18,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-40px)',
      transition: 'all .4s cubic-bezier(.4,0,.2,1)',
      pointerEvents: 'auto',
      border: '2px solid #fcb69f',
      cursor: 'pointer',
    }}
      onClick={handleClick}
    >
      <span style={{fontSize:32,marginRight:8,marginTop:2}}>📰</span>
      <div>
        <div style={{fontWeight:700,fontSize:'1.18em',marginBottom:4}}>{news.title}</div>
        <div style={{fontSize:'1em',color:'#444',marginBottom:6}}>{news.content}</div>
        <div style={{fontSize:'0.92em',color:'#888'}}>Опубликовано: {new Date(news.publishAt||Date.now()).toLocaleString('ru-RU')}</div>
      </div>
    </div>
  );
}

export default function SocketProvider({ children }) {
  const { state, dispatch } = useApp();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const [newsToast, setNewsToast] = useState(null);
  // Реф для хранения текущего чата
  const currentChatRef = useRef(state.currentChat);

  // playNotificationSound удалён, используется только message.mp3

  // Функция для получения текущего пользователя
  const getCurrentUser = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem('user'));
    } catch {
      return null;
    }
  }, []);

  // Функция переподключения
  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current += 1;
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: `Попытка переподключения ${reconnectAttemptsRef.current}/${maxReconnectAttempts}...`
        }
      });

      reconnectTimeoutRef.current = setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.connect();
        }
      }, 2000 * reconnectAttemptsRef.current);
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Не удалось подключиться к серверу. Проверьте соединение.'
      });
    }
  }, [dispatch]);

  // Обновляем реф при изменении текущего чата
  useEffect(() => {
    currentChatRef.current = state.currentChat;
  }, [state.currentChat]);

  // Запрашиваем закрепленные сообщения при изменении currentChat
  useEffect(() => {
    if (state.currentChat?.id && window.socket && window.isSocketAuthenticated) {
      console.log('[SocketProvider] Запрашиваем закрепленные сообщения для чата:', state.currentChat.id);
      window.socket.emit('get_pinned_messages', state.currentChat.id);
    }
  }, [state.currentChat?.id]);

  useEffect(() => {
    // Получаем токен из localStorage или из state
    const token = localStorage.getItem('token') || state.user?.token;
    
    // Если нет токена, не пытаемся подключаться
    if (!token) {
      console.log('❌ No token available for socket connection');
      return;
    }

    // Создаем соединение с правильной передачей токена
    // Определяем базовый URL: приоритет window.SOCKET_BASE_URL -> REACT_APP_SOCKET_URL -> origin
    const protocolAwareOrigin = `${window.location.protocol}//${window.location.host}`;
    const storedBaseUrl = (() => { try { return localStorage.getItem('SOCKET_BASE_URL') || null; } catch { return null; } })();
    const envBaseUrl = (typeof process !== 'undefined' && process.env && process.env.REACT_APP_SOCKET_URL) ? process.env.REACT_APP_SOCKET_URL : null;
    let baseUrl = window.SOCKET_BASE_URL || storedBaseUrl || envBaseUrl || protocolAwareOrigin;
    try {
      const url = new URL(baseUrl);
      const isLocal3001 = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '3001';
      if (isLocal3001) {
        url.port = '5000';
        baseUrl = url.toString();
      }
    } catch {}
    // Если передан только хост без протокола — достраиваем протокол из текущего окна
    if (typeof baseUrl === 'string' && !/^https?:\/\//i.test(baseUrl)) {
      baseUrl = `${window.location.protocol}//${baseUrl.replace(/^\/*/, '')}`;
    }
    // На https используем wss/websocket через https-оригин
    // socket.io-client сам выберет ws/wss по схеме baseUrl
    console.log('🔌 Connecting to Socket.IO at:', baseUrl);
    socketRef.current = io(baseUrl, {
      // Сначала long-polling, затем апгрейд до WebSocket — снижает риск раннего закрытия
      transports: ['polling', 'websocket'],
      upgrade: true,
      rememberUpgrade: true,
      // Надёжные параметры реконнекта
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 25000,
      // Не форсим новый инстанс, позволяем переиспользовать при реконнекте
      forceNew: false,
      autoConnect: true,
      auth: {
        token: token
      }
    });

    const socket = socketRef.current;

    // Глобальный обработчик всех событий сокета для отладки
    if (socket && typeof socket.onAny === 'function') {
      socket.onAny((event, ...args) => {
        console.log('[SOCKET][onAny] event:', event, args);
        fetch('/api/client-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tag: 'SOCKET_onAny',
            event,
            args
          })
        });
      });
    }

    // === ОБРАБОТЧИКИ ПОДКЛЮЧЕНИЯ ===
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      reconnectAttemptsRef.current = 0;
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'Подключение установлено'
        }
      });

      // Аутентификация происходит автоматически через auth.token
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'warning',
          message: 'Соединение потеряно. Попытка переподключения...'
        }
      });

      if (reason === 'io server disconnect') {
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      
      // Проверяем, является ли ошибка аутентификацией
      if (error.message && error.message.includes('auth')) {
        dispatch({
          type: 'SET_ERROR',
          payload: 'Ошибка авторизации. Войдите заново.'
        });

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
      } else {
        attemptReconnect();
      }
    });

    // === ОБРАБОТЧИКИ АУТЕНТИФИКАЦИИ ===
    socket.on('authenticated', (data) => {
      console.log('✅ Authenticated:', data);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'Успешная авторизация'
        }
      });
      // Запрашиваем начальные данные
      socket.emit('get_chats');
      socket.emit('get_online_users');
      // Глобальный флаг аутентификации сокета
      window.isSocketAuthenticated = true;
      
      // Автоматически запрашиваем переписку для уже выбранного чата
      const currentChat = currentChatRef.current;
      if (currentChat?.id) {
        console.log('[SocketProvider] Запрашиваем переписку для текущего чата после аутентификации:', currentChat.id);
        socket.emit('join_chat', currentChat.id);
        socket.emit('get_chat_messages', currentChat.id);
        socket.emit('get_pinned_messages', currentChat.id);
      }
    });

    socket.on('need_auth', () => {
      const token = localStorage.getItem('token') || state.user?.token;
      if (token) {
        socket.emit('authenticate', token);
      }
    });

    socket.on('auth_error', (error) => {
      console.error('❌ Auth error:', error);
      dispatch({
        type: 'SET_ERROR',
        payload: 'Ошибка авторизации. Войдите заново.'
      });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    });

    // === УДАЛЕНИЕ СООБЩЕНИЯ ===
    socket.on('message_deleted', (data) => {
      console.log('[SOCKET] message_deleted event received:', data);
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: 'SOCKET_message_deleted',
          data
        })
      });
      // Явное логирование перед диспатчем
      console.log('[CLIENT SOCKET] dispatch DELETE_MESSAGE', data.messageId);
      fetch('/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag: 'CLIENT_SOCKET_dispatch_DELETE_MESSAGE',
          messageId: data.messageId
        })
      });
      dispatch({ type: 'DELETE_MESSAGE', payload: { messageId: data.messageId } });
      setTimeout(() => {
        console.log('[SOCKET] State after DELETE_MESSAGE:', window.__APP_STATE__);
      }, 100);
    });

    // === ОБРАБОТЧИКИ ЧАТОВ ===
    socket.on('chats', (chats) => {
      console.log('📋 Received chats:', chats);
      dispatch({ type: 'SET_CHATS', payload: chats });
      
      // Если есть текущий чат, запрашиваем его закрепленные сообщения
      const currentChat = currentChatRef.current;
      if (currentChat?.id) {
        console.log('[SocketProvider] Запрашиваем закрепленные сообщения для восстановленного чата:', currentChat.id);
        socket.emit('get_pinned_messages', currentChat.id);
      }
    });

    socket.on('chats_updated', (chats) => {
      console.log('📋 Chats updated:', chats);
      dispatch({ type: 'UPDATE_CHATS', payload: chats });
    });

    // ОБРАБОТЧИК УДАЛЕНИЯ ЧАТА
    socket.on('chat_deleted', (data) => {
      console.log('🗑️ Chat deleted:', data);
      dispatch({ type: 'DELETE_CHAT', payload: { chatId: data.chatId } });
      
      // Если удаленный чат был активным, сбрасываем текущий чат
      if (state.currentChat?.id === data.chatId) {
        dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
      }
      
      // Запрашиваем обновленный список чатов с сервера
      socket.emit('get_chats');
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Чат "${data.chatName || 'Чат'}" удален`
        }
      });
    });

    // ДОБАВЛЯЕМ ОБРАБОТЧИК ДЛЯ СОЗДАНИЯ ЧАТОВ
    socket.on('chat_created', (data) => {
      console.log('✅ Chat created:', data);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Чат "${data.name}" создан!`
        }
      });
      
      // Обновляем список чатов
      socket.emit('get_chats');
      
      // Автоматически переходим в новый чат
      dispatch({ type: 'SET_CURRENT_CHAT', payload: data });
      socket.emit('join_chat', data.id);
    });

    socket.on('new_chat_created', (chat) => {
      console.log('📢 New chat created:', chat);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: `Вас добавили в чат "${chat.name}"`
        }
      });
      
      socket.emit('get_chats');
    });

    // === ОБРАБОТЧИКИ СООБЩЕНИЙ ===
    socket.on('chat_messages', (data) => {
      console.log('[SocketProvider] chat_messages:', data);
      dispatch({ type: 'SET_MESSAGES', payload: data.messages });
      
      // ВСЕГДА запрашиваем закрепленные сообщения при получении сообщений чата
      if (data.chatId) {
        console.log('[SocketProvider] Запрашиваем закрепленные сообщения для чата:', data.chatId);
        socket.emit('get_pinned_messages', data.chatId);
      }
      
      if (data.chatId === state.currentChat?.id) {
        socket.emit('mark_chat_read', data.chatId);
        // Сбрасываем счётчики по пользователям-авторам сообщений в открытом чате
        if (Array.isArray(data.messages)) {
          const meId = state.user?.id;
          const uniqueAuthors = Array.from(new Set(data.messages.map(m => m && m.user_id).filter(id => id != null && id !== meId)));
          uniqueAuthors.forEach(authorId => {
            dispatch({ type: 'CLEAR_UNREAD_BY_USER', payload: { userId: authorId } });
          });
        }
      }
    });

    socket.on('new_message', (message) => {
      console.log('📨 New message received:', message);
      if (!message || !message.chat_id) {
        console.warn('[SocketProvider] new_message without chat_id', message);
      }
      
      // Проверяем файловую информацию
      if (message.message_type === 'file' && message.file_info) {
        console.log('📎 File info:', message.file_info);
      }
      
      const currentUser = getCurrentUser();
      
      if (message.chat_id === state.currentChat?.id) {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
        socket.emit('mark_message_read', message.id);
      } else {
        console.log('[SocketProvider] message for inactive chat, increment unread', { chatId: message.chat_id });
        dispatch({
          type: 'UPDATE_CHAT_UNREAD_COUNT',
          payload: {
            chatId: message.chat_id,
            count: message.unread_count || 1
          }
        });
        // Увеличиваем счётчик по пользователю-отправителю для модалки сотрудников
        if (message.user_id != null && message.user_id !== currentUser?.id) {
          dispatch({ type: 'INCREMENT_UNREAD_BY_USER', payload: { userId: message.user_id } });
        }
      }
    
      dispatch({
        type: 'UPDATE_LAST_MESSAGE',
        payload: {
          chatId: message.chat_id,
          content: message.content || (message.message_type === 'file' ? '📎 Файл' : message.content),
          timestamp: message.created_at
        }
      });
      
      if (message.user_id !== currentUser?.id) {
        // Мгновенное воспроизведение звука уведомления
        if (message.chat_id !== state.currentChat?.id) {
          playNotificationSound(0.3);
          const displayContent = message.content || (message.message_type === 'file' ? '📎 Файл' : '');
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              type: 'info',
              message: `${message.username}: ${displayContent.substring(0, 50)}${displayContent.length > 50 ? '...' : ''}`
            }
          });
        }
      }
    });

    // ДОБАВЛЯЕМ ОБРАБОТЧИК ДЛЯ ОТПРАВКИ СООБЩЕНИЙ
    socket.on('message_sent', (data) => {
      console.log('✅ Message sent successfully:', data);
    });

    socket.on('message_error', (error) => {
      console.error('❌ Message error:', error);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: 'Ошибка отправки сообщения'
        }
      });
    });

    // === ОБРАБОТЧИКИ ЛАЙКОВ ===
    socket.on('message_liked', (data) => {
      console.log('❤️ Message liked:', data);
      const currentUser = getCurrentUser();
      
      dispatch({
        type: 'UPDATE_MESSAGE_LIKES',
        payload: {
          messageId: data.messageId,
          likesCount: data.likesCount,
          userLiked: data.likes.some(like => like.user_id === currentUser?.id)
        }
      });

      if (data.userId !== currentUser?.id) {
        // playNotificationSound удалён, используем только message.mp3
      }
    });

    socket.on('message_unliked', (data) => {
      console.log('💔 Message unliked:', data);
      const currentUser = getCurrentUser();
      
      dispatch({
        type: 'UPDATE_MESSAGE_LIKES',
        payload: {
          messageId: data.messageId,
          likesCount: data.likesCount,
          userLiked: data.likes.some(like => like.user_id === currentUser?.id)
        }
      });
    });

    // === ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЕЙ ===
    socket.on('online_users', (users) => {
      console.log('👥 Online users:', users);
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    socket.on('all_users', (users) => {
      console.log('👥 All users:', users);
      // Этот обработчик будет использоваться в UserSelectionModal
    });

    socket.on('user_status_changed', (data) => {
      console.log('🔄 User status changed:', data);
      dispatch({
        type: 'UPDATE_USER_STATUS',
        payload: {
          userId: data.userId,
          online: data.online
        }
      });
    });

    // === ОБРАБОТЧИКИ ПЕЧАТИ ===
    socket.on('user_typing', (data) => {
      if (data.chatId === state.currentChat?.id) {
        dispatch({ type: 'ADD_TYPING_USER', payload: data.username });
      }
    });

    socket.on('user_stop_typing', (data) => {
      if (data.chatId === state.currentChat?.id) {
        dispatch({ type: 'REMOVE_TYPING_USER', payload: data.username });
      }
    });

    // === ОБРАБОТЧИКИ ЧАТОВ И УЧАСТНИКОВ ===
    socket.on('private_chat_created', (data) => {
      console.log('✅ Private chat created:', data);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Приватный чат создан`
        }
      });
      
  dispatch({ type: 'SET_CURRENT_CHAT', payload: data.chat });
  socket.emit('join_chat', data.chat.id);
  socket.emit('get_chat_messages', data.chat.id);
  socket.emit('get_pinned_messages', data.chat.id);
  if (window.setMessengerView) window.setMessengerView('chat');
    });

    socket.on('chat_exists', (chat) => {
      console.log('ℹ️ Chat already exists:', chat);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: 'Чат с этим пользователем уже существует'
        }
      });
      
      dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
      socket.emit('join_chat', chat.id);
      socket.emit('get_chat_messages', chat.id);
      socket.emit('get_pinned_messages', chat.id);
    });

    socket.on('user_added_to_chat', (data) => {
      console.log('✅ User added to chat:', data);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Пользователь ${data.username} добавлен в чат`
        }
      });
      
      // Обновляем список чатов
      socket.emit('get_chats');
    });

    socket.on('message_likes_list', (data) => {
      console.log('❤️ Message likes list:', data);
      dispatch({ 
        type: 'TOGGLE_MODAL', 
        payload: { modal: 'likes', show: true } 
      });
    });

    socket.on('chat_participants', (data) => {
      console.log('👥 Chat participants:', data);
      dispatch({ type: 'SET_CHAT_PARTICIPANTS', payload: data.participants });
      // Не открываем chatInfo-модалку автоматически, чтобы не перекрывать userSelection
    });

    // === ОБРАБОТЧИКИ ЗАКРЕПЛЕННЫХ СООБЩЕНИЙ ===
    socket.on('pinned_messages', (data) => {
      console.log('📌 Pinned messages received:', data);
      console.log('📌 Messages count:', data.messages?.length || 0);
      console.log('📌 Messages array:', data.messages);
      dispatch({ 
        type: 'SET_PINNED_MESSAGES', 
        payload: { chatId: data.chatId, messages: data.messages || [] } 
      });
    });

    socket.on('message_pinned', (data) => {
      console.log('📌 Message pinned:', data);
      if (data.isPinned) {
        dispatch({ 
          type: 'ADD_PINNED_MESSAGE', 
          payload: { chatId: data.chatId, message: data.message } 
        });
      }
    });

    socket.on('message_unpinned', (data) => {
      console.log('📌 Message unpinned:', data);
      if (!data.isPinned) {
        dispatch({ 
          type: 'REMOVE_PINNED_MESSAGE', 
          payload: { chatId: data.chatId, messageId: data.messageId } 
        });
      }
    });

    // === ОБРАБОТЧИКИ ОШИБОК ===
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
      
      // Специальная обработка ошибок доступа к чату
      if (error && (error.includes('доступа к этому чату') || error.includes('Нет доступа') || error.includes('нет доступа'))) {
        const currentChat = currentChatRef.current;
        if (currentChat?.id) {
          console.log('[SocketProvider] Ошибка доступа к чату, очищаем текущий чат:', currentChat.id);
          // Очищаем сохраненный чат из localStorage
          localStorage.removeItem('currentChat');
          // Сбрасываем текущий чат в состоянии
          dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
          dispatch({ type: 'SET_MESSAGES', payload: [] });
          dispatch({ type: 'SET_CHAT_PARTICIPANTS', payload: [] });
          dispatch({ type: 'SET_PINNED_MESSAGES', payload: { chatId: currentChat.id, messages: [] } });
        }
        
        dispatch({
          type: 'SET_ERROR',
          payload: null // Очищаем ошибку после обработки
        });

        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: {
            type: 'warning',
            message: 'У вас больше нет доступа к этому чату. Чат был удален из списка.'
          }
        });
        return;
      }
      
      dispatch({
        type: 'SET_ERROR',
        payload: error
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          message: error
        }
      });
    });

    // Сохраняем сокет в window для доступа из компонентов
    window.socket = socket;
    console.log('✅ Socket saved to window.socket:', !!window.socket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      
      window.socket = null;
      console.log('🔌 Socket cleared from window.socket');
    };
  }, [state.user?.token, state.currentChat?.id, dispatch, getCurrentUser, attemptReconnect]);

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!socketRef.current) return;
    const socket = socketRef.current;
    const newsHandler = (news) => {
      console.log('SocketProvider: PUSH news-published', news);
      dispatch({ type: 'INCREMENT_UNREAD_NEWS' });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: `📰 Новость: "${news.title}" опубликована!`,
          description: news.content,
          duration: 7000 // 7 секунд
        }
      });
      setNewsToast(news); // показываем тост
      window.dispatchEvent(new CustomEvent('news-published', { detail: news }));
    };
    socket.on('news-published', newsHandler);
    return () => {
      if (socket) socket.off('news-published', newsHandler);
    };
  }, [dispatch]);

  return <>
    {children}
    {newsToast && <NewsToast news={newsToast} onClose={()=>setNewsToast(null)} />}
  </>;
}