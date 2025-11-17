import { useEffect, useRef, useCallback } from 'react';
import { playNotificationSound } from '../utils/notificationSound';
import io from 'socket.io-client';
import { useApp } from '../context/AppContext';

export function useSocket(token) {
  const socketRef = useRef(null);
  const { dispatch, state } = useApp();
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Отключаем playNotificationSound, используем только message.mp3

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
      }, 2000 * reconnectAttemptsRef.current); // Увеличиваем интервал с каждой попыткой
    } else {
      dispatch({
        type: 'SET_ERROR',
        payload: 'Не удалось подключиться к серверу. Проверьте соединение.'
      });
    }
  }, [dispatch]);

  useEffect(() => {
    if (!token) return;

    // Создаем соединение
    const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : 'localhost';
    const port = process.env.REACT_APP_SOCKET_PORT || 5000;
    let baseUrl = process.env.REACT_APP_SOCKET_URL || `http://${host}:${port}`;
    try {
      const url = new URL(baseUrl);
      const isLocal3001 = (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.port === '3001';
      if (isLocal3001) {
        url.port = '5000';
        baseUrl = url.toString();
      }
    } catch {}

    socketRef.current = io(baseUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      auth: { token }
    });

    const socket = socketRef.current;

    // === ОБРАБОТЧИКИ ПОДКЛЮЧЕНИЯ ===
    socket.on('connect', () => {
      console.log('Connected to server');
      reconnectAttemptsRef.current = 0; // Сбрасываем счетчик попыток
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: 'Подключение установлено'
        }
      });

      socket.emit('authenticate', token);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'warning',
          message: 'Соединение потеряно. Попытка переподключения...'
        }
      });

      if (reason === 'io server disconnect') {
        // Сервер принудительно отключил - переподключаемся
        attemptReconnect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      attemptReconnect();
    });

    // === ОБРАБОТЧИКИ АУТЕНТИФИКАЦИИ ===
    socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      
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
    });

    socket.on('auth_error', (error) => {
      console.error('Auth error:', error);
      
      dispatch({
        type: 'SET_ERROR',
        payload: 'Ошибка авторизации. Войдите заново.'
      });

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGOUT' });
    });

    // === ОБРАБОТЧИКИ ЧАТОВ ===
    socket.on('chats', (chats) => {
      dispatch({ type: 'SET_CHATS', payload: chats });
    });

    socket.on('chats_updated', (chats) => {
      dispatch({ type: 'UPDATE_CHATS', payload: chats });
    });

    socket.on('new_chat_created', (chat) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: `Вас добавили в чат "${chat.name}"`
        }
      });
      
      // Обновляем список чатов
      socket.emit('get_chats');
    });

    // === ОБРАБОТЧИКИ СООБЩЕНИЙ ===
    socket.on('chat_messages', (data) => {
      dispatch({ type: 'SET_MESSAGES', payload: data.messages });
      
      // Отмечаем чат как прочитанный
      if (data.chatId === state.currentChat?.id) {
        socket.emit('mark_chat_read', data.chatId);
      }
    });

    socket.on('new_message', (message) => {
      console.log('[useSocket] ПОЛУЧЕНО СОБЫТИЕ new_message', message);
      const currentUser = getCurrentUser();
      
      // Добавляем сообщение только если оно относится к текущему чату
      if (message.chat_id === state.currentChat?.id) {
        dispatch({ type: 'ADD_MESSAGE', payload: message });
        
        // Отмечаем как прочитанное если это текущий чат
        socket.emit('mark_message_read', message.id);
      } else {
        // Обновляем счетчик непрочитанных
        dispatch({
          type: 'UPDATE_CHAT_UNREAD_COUNT',
          payload: {
            chatId: message.chat_id,
            count: message.unread_count || 1
          }
        });
      }

      // Обновляем последнее сообщение в списке чатов
      dispatch({
        type: 'UPDATE_LAST_MESSAGE',
        payload: {
          chatId: message.chat_id,
          content: message.content,
          timestamp: message.created_at
        }
      });
      
      // Воспроизводим звук если сообщение не от текущего пользователя
      if (message.user_id !== currentUser?.id) {
        console.log('[useSocket] new_message, будет вызван playNotificationSound', message);
        playNotificationSound(0.3);
        // Показываем уведомление если чат не активен
        if (message.chat_id !== state.currentChat?.id) {
          dispatch({
            type: 'ADD_NOTIFICATION',
            payload: {
              type: 'info',
              message: `${message.username}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`
            }
          });
        }
      }
    });

    // === ОБРАБОТЧИКИ ЛАЙКОВ ===
    socket.on('message_liked', (data) => {
      const currentUser = getCurrentUser();
      
      dispatch({
        type: 'UPDATE_MESSAGE_LIKES',
        payload: {
          messageId: data.messageId,
          likesCount: data.likesCount,
          userLiked: data.likes.some(like => like.user_id === currentUser?.id)
        }
      });

      // Звук лайка если лайк поставил не текущий пользователь
      if (data.userId !== currentUser?.id) {
        playNotificationSound(0.3);
      }
    });

    socket.on('message_unliked', (data) => {
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

    socket.on('message_likes_list', (data) => {
      // Обработчик уже есть в AppContext
    });

    // === ОБРАБОТЧИКИ ПОЛЬЗОВАТЕЛЕЙ ===
    socket.on('online_users', (users) => {
      dispatch({ type: 'SET_ONLINE_USERS', payload: users });
    });

    socket.on('all_users', (users) => {
      // Обработчик уже есть в UserSelectionModal
    });

    socket.on('user_status_changed', (data) => {
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
        dispatch({ type: 'REMOVE_TYPING_user', payload: data.username });
      }
    });

    // === ОБРАБОТЧИКИ ЧАТОВ И УЧАСТНИКОВ ===
    socket.on('private_chat_created', (data) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Приватный чат "${data.chatName}" создан!`
        }
      });
      
      // Автоматически переходим в новый чат
      dispatch({ type: 'SET_CURRENT_CHAT', payload: data.chat });
      socket.emit('join_chat', data.chat.id);
    });

    socket.on('chat_exists', (chat) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          message: 'Чат с этим пользователем уже существует'
        }
      });
      
      // Переходим в существующий чат
      dispatch({ type: 'SET_CURRENT_CHAT', payload: chat });
      socket.emit('join_chat', chat.id);
    });

    socket.on('user_added_to_chat', (data) => {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          message: `Пользователь ${data.username} добавлен в чат`
        }
      });
    });

    socket.on('chat_participants', (data) => {
      console.log('[useSocket] chat_participants:', data);
      dispatch({ type: 'SET_CHAT_PARTICIPANTS', payload: data.participants });
    });

    // === ОБРАБОТЧИКИ ОШИБОК ===
    socket.on('error', (error) => {
      console.error('Socket error:', error);
      
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

    // === ОЧИСТКА ===
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket && typeof socket.removeAllListeners === 'function') {
        socket.removeAllListeners();
      }
      if (socket && typeof socket.disconnect === 'function') {
        socket.disconnect();
      }
    };
  }, [token, dispatch, state.currentChat?.id, playNotificationSound, getCurrentUser, attemptReconnect]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return socketRef.current;
}