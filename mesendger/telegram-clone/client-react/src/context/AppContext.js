import React, { createContext, useContext, useReducer, useEffect } from 'react';

const AppContext = createContext();

const parseMessageTimestamp = (message) => {
  if (!message) return 0;
  const value = message.created_at || message.createdAt || message.timestamp;
  if (!value) return 0;
  let date;
  if (typeof value === 'string' && value.includes('T') && !value.includes('Z') && !value.includes('+')) {
    date = new Date(value + 'Z');
  } else {
    date = new Date(value);
  }
  const time = date.getTime();
  if (!Number.isFinite(time)) {
    const fallback = Number(message.id) || 0;
    return fallback;
  }
  return time;
};

const sortMessagesChronologically = (messages = []) => {
  return [...messages].sort((a, b) => {
    const diff = parseMessageTimestamp(a) - parseMessageTimestamp(b);
    if (diff !== 0 && Number.isFinite(diff)) return diff;
    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });
};

const initialState = {
  user: null,
  chats: [],
  currentChat: null,
  messages: [],
  onlineUsers: [],
  isAuthenticated: false,
  loading: false,
  error: null,
  typingUsers: [],
  replyToMessage: null,
  showEmojiPicker: false,
  filePreview: null,
  selectedUsers: [],
  chatParticipants: [],
  notifications: [],
  lastPrivateTarget: null,
  modals: {
    createChat: false,
    userSelection: false,
    likes: false,
    chatInfo: false,
    filePreview: false,
    settings: false,
    employeesList: false,
    chatsList: false,
    shareMessage: false
  },
  shareMessageData: null,
  unreadNews: 0,
  unreadChats: 0, // глобальный счетчик непрочитанных чатов
  unreadByUser: {}, // { [userId]: count } для приватных 1:1
  pinnedMessages: {} // { [chatId]: [messages] } для закрепленных сообщений
};

function appReducer(state, action) {
  // Глобальное логирование экшенов с троттлингом повторяющихся типов
  if (typeof window !== 'undefined') {
    window.__APP_STATE__ = state;
    window.__LAST_ACTION__ = action;
    const nowTs = Date.now();
    const key = action.type;
    const lastLogMap = (window.__REDUCER_LAST_LOG__ = window.__REDUCER_LAST_LOG__ || {});
    const last = lastLogMap[key] || 0;
    // По умолчанию троттлим часто стреляющие экшены (напр., SET_UNREAD_CHATS) до 1000мс
    const throttleMs = key === 'SET_UNREAD_CHATS' ? 1500 : 250;
    if (nowTs - last >= throttleMs) {
      lastLogMap[key] = nowTs;
      console.log('[REDUCER] Action:', action.type, action);
      try {
        if (typeof fetch === 'function' && key !== 'SET_UNREAD_CHATS') {
          fetch('/api/client-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tag: 'REDUCER_ACTION', actionType: action.type, action })
          }).catch(() => {});
        }
      } catch (_) {}
    }
  }
  switch (action.type) {
    case 'UPDATE_USER_AVATAR': {
      // Обновляем avatarUrl в localStorage
      const user = localStorage.getItem('user');
      let updatedUser = state.user;
      if (user) {
        try {
          updatedUser = { ...JSON.parse(user), avatarUrl: action.payload };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        } catch (e) {
          // fallback если localStorage поврежден
          updatedUser = { ...state.user, avatarUrl: action.payload };
        }
      } else {
        updatedUser = { ...state.user, avatarUrl: action.payload };
      }
      return {
        ...state,
        user: updatedUser
      };
    }
    case 'DELETE_CHAT': {
      const filteredChats = state.chats.filter(chat => chat.id !== action.payload.chatId);
      let newCurrentChat = state.currentChat;
      if (state.currentChat && state.currentChat.id === action.payload.chatId) {
        newCurrentChat = null;
      }
      return {
        ...state,
        chats: filteredChats,
        currentChat: newCurrentChat,
        messages: [],
        notifications: [
          ...state.notifications,
          {
            id: Date.now(),
            type: 'info',
            message: 'Чат успешно удалён',
            timestamp: new Date().toISOString()
          }
        ]
      };
    }
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload, 
        isAuthenticated: true,
        loading: false,
        error: null
      };


    case 'SET_CHATS': {
      const unreadChats = action.payload.filter(chat => chat.unread_count > 0).length;
      return { ...state, chats: action.payload, unreadChats };
    }


    case 'UPDATE_CHATS': {
      const unreadChats = action.payload.filter(chat => chat.unread_count > 0).length;
      return { ...state, chats: action.payload, unreadChats };
    }

    case 'SET_CURRENT_CHAT': {
        // При открытии приватного чата обнуляем счётчик по собеседнику
        const current = action.payload;
        let nextUnreadByUser = state.unreadByUser || {};
        if (current && current.isPrivate && Array.isArray(current.participants)) {
          const meId = state.user?.id;
          const other = current.participants.find(p => p.id !== meId);
          if (other && other.id != null) {
            nextUnreadByUser = { ...nextUnreadByUser, [other.id]: 0 };
          }
        }
        // Сохраняем текущий чат в localStorage
        if (action.payload) {
          localStorage.setItem('currentChat', JSON.stringify(action.payload));
        } else {
          localStorage.removeItem('currentChat');
        }
        
        return {
        ...state, 
        currentChat: action.payload,
        replyToMessage: null,
        showEmojiPicker: false,
        unreadByUser: nextUnreadByUser
      };
    }

    case 'SET_LAST_PRIVATE_TARGET':
      return { ...state, lastPrivateTarget: action.payload };

    case 'CLEAR_LAST_PRIVATE_TARGET':
      return { ...state, lastPrivateTarget: null };

    case 'SET_MESSAGES':
      return { ...state, messages: sortMessagesChronologically(action.payload) };

    case 'ADD_MESSAGE':
      if (action.payload.chat_id === state.currentChat?.id) {
        return { 
          ...state, 
          messages: sortMessagesChronologically([...state.messages, action.payload]) 
        };
      }
      return state;

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.id ? { ...msg, ...action.payload } : msg
        )
      };

    case 'DELETE_MESSAGE':
      console.log('[REDUCER] DELETE_MESSAGE', action.payload.messageId, state.messages.map(m => m.id));
      try {
        if (typeof fetch === 'function') {
          fetch('/api/client-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tag: 'DELETE_MESSAGE',
              data: {
                messageId: action.payload.messageId,
                messages: state.messages.map(m => m.id)
              }
            })
          }).catch(() => {});
        }
      } catch (_) {}
      return {
        ...state,
        messages: state.messages.filter(msg => String(msg.id) !== String(action.payload.messageId))
      };

    case 'UPDATE_MESSAGE_LIKES':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? { 
                ...msg, 
                likes_count: action.payload.likesCount, 
                user_liked: action.payload.userLiked ? 1 : 0
              }
            : msg
        )
      };

    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };

    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };

    case 'ADD_TYPING_USER':
      if (!state.typingUsers.includes(action.payload)) {
        return { 
          ...state, 
          typingUsers: [...state.typingUsers, action.payload] 
        };
      }
      return state;

    case 'REMOVE_TYPING_USER':
      return { 
        ...state, 
        typingUsers: state.typingUsers.filter(user => user !== action.payload) 
      };

    case 'SET_REPLY_TO_MESSAGE':
      return { 
        ...state, 
        replyToMessage: action.payload,
        showEmojiPicker: false
      };

    case 'SET_FILE_PREVIEW':
      return { ...state, filePreview: action.payload };

    case 'TOGGLE_EMOJI_PICKER':
      return { 
        ...state, 
        showEmojiPicker: !state.showEmojiPicker
      };

    case 'CLOSE_EMOJI_PICKER':
      return { ...state, showEmojiPicker: false };

    case 'TOGGLE_MODAL':
      const newModals = { ...state.modals };
      
      if (action.payload.show) {
        Object.keys(newModals).forEach(key => {
          newModals[key] = key === action.payload.modal;
        });
      } else {
        newModals[action.payload.modal] = false;
      }

      return {
        ...state,
        modals: newModals,
        ...(action.payload.modal === 'userSelection' && !action.payload.show && {
          selectedUsers: []
        }),
        ...(action.payload.modal === 'chatInfo' && !action.payload.show && {
          chatParticipants: []
        }),
        ...(action.payload.modal === 'shareMessage' && !action.payload.show && {
          shareMessageData: null
        })
      };

    case 'SHOW_SHARE_MODAL':
      return {
        ...state,
        modals: {
          ...Object.keys(state.modals).reduce((acc, key) => {
            acc[key] = false;
            return acc;
          }, {}),
          shareMessage: true
        },
        shareMessageData: action.payload.message
      };

    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: Object.keys(state.modals).reduce((acc, key) => {
          acc[key] = false;
          return acc;
        }, {}),
        selectedUsers: [],
        chatParticipants: []
      };

    case 'SET_SELECTED_USERS':
      return { ...state, selectedUsers: action.payload };

    case 'ADD_SELECTED_USER':
      if (!state.selectedUsers.find(user => user.id === action.payload.id)) {
        return { 
          ...state, 
          selectedUsers: [...state.selectedUsers, action.payload] 
        };
      }
      return state;

    case 'REMOVE_SELECTED_USER':
      return { 
        ...state, 
        selectedUsers: state.selectedUsers.filter(user => user.id !== action.payload.id) 
      };

    case 'SET_CHAT_PARTICIPANTS':
      return { ...state, chatParticipants: action.payload };

    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [...state.notifications, {
          id: Date.now(),
          ...action.payload,
          timestamp: new Date().toISOString()
        }] 
      };

    case 'REMOVE_NOTIFICATION':
      return { 
        ...state, 
        notifications: state.notifications.filter(notif => notif.id !== action.payload.id) 
      };

    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };

    case 'SET_LOADING':
      return { ...state, loading: action.payload };

    case 'SET_ERROR':
      return { 
        ...state, 
        error: action.payload,
        loading: false
      };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'UPDATE_USER_STATUS':
      return {
        ...state,
        onlineUsers: state.onlineUsers.map(user =>
          user.id === action.payload.userId
            ? { ...user, online: action.payload.online }
            : user
        )
      };


    case 'UPDATE_CHAT_UNREAD_COUNT': {
      const { chatId, count = 1, mode = 'increment' } = action.payload || {};
      const updatedChats = state.chats.map(chat => {
        if (chat.id !== chatId) return chat;
        const current = Number(chat.unread_count) || 0;
        const next = mode === 'set' ? Math.max(0, Number(count) || 0) : current + (Number(count) || 1);
        return { ...chat, unread_count: next };
      });
      const unreadChats = updatedChats.filter(chat => (Number(chat.unread_count) || 0) > 0).length;
      return {
        ...state,
        chats: updatedChats,
        unreadChats
      };
    }


    case 'MARK_CHAT_AS_READ': {
      const updatedChats = state.chats.map(chat =>
        chat.id === action.payload.chatId
          ? { ...chat, unread_count: 0 }
          : chat
      );
      const unreadChats = updatedChats.filter(chat => chat.unread_count > 0).length;
      // Сбрасываем счётчики по пользователям-участникам этого чата
      let nextUnreadByUser = { ...(state.unreadByUser || {}) };
      const participants = action.payload.participants;
      if (Array.isArray(participants)) {
        participants.forEach(p => {
          if (p && p.id != null) nextUnreadByUser[p.id] = 0;
        });
      }
      return {
        ...state,
        chats: updatedChats,
        unreadChats,
        unreadByUser: nextUnreadByUser
      };
    }

    case 'UPDATE_LAST_MESSAGE':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat.id === action.payload.chatId
            ? { 
                ...chat, 
                last_message: action.payload.content,
                last_message_time: action.payload.timestamp
              }
            : chat
        )
      };

    case 'INCREMENT_UNREAD_BY_USER': {
      const userId = action.payload?.userId;
      if (userId == null) return state;
      const current = Number((state.unreadByUser || {})[userId]) || 0;
      return {
        ...state,
        unreadByUser: { ...(state.unreadByUser || {}), [userId]: current + 1 }
      };
    }

    case 'CLEAR_UNREAD_BY_USER': {
      const userId = action.payload?.userId;
      if (userId == null) return state;
      return {
        ...state,
        unreadByUser: { ...(state.unreadByUser || {}), [userId]: 0 }
      };
    }

    case 'LOGOUT':
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('currentChat');
      return { ...initialState };

    case 'RESET_STATE':
      return { ...initialState };

    case 'INCREMENT_UNREAD_NEWS':
      return { ...state, unreadNews: state.unreadNews + 1 };

    case 'RESET_UNREAD_NEWS':
      return { ...state, unreadNews: 0 };

    case 'SET_UNREAD_NEWS_COUNT':
      return { ...state, unreadNews: action.payload };

    case 'SET_PINNED_MESSAGES':
      return { 
        ...state, 
        pinnedMessages: {
          ...state.pinnedMessages,
          [action.payload.chatId]: action.payload.messages
        }
      };

    case 'ADD_PINNED_MESSAGE':
      return {
        ...state,
        pinnedMessages: {
          ...state.pinnedMessages,
          [action.payload.chatId]: [
            ...(state.pinnedMessages[action.payload.chatId] || []),
            action.payload.message
          ]
        }
      };

    case 'REMOVE_PINNED_MESSAGE':
      return {
        ...state,
        pinnedMessages: {
          ...state.pinnedMessages,
          [action.payload.chatId]: (state.pinnedMessages[action.payload.chatId] || [])
            .filter(msg => msg.id !== action.payload.messageId)
        }
      };

    case 'UPDATE_MESSAGE_PIN_STATUS':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.messageId 
            ? { ...msg, is_pinned: action.payload.isPinned }
            : msg
        )
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Инициализация пользователя из localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      try {
        const parsedUser = JSON.parse(user);
        dispatch({ 
          type: 'SET_USER', 
          payload: { ...parsedUser, token } 
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    // Восстанавливаем текущий чат из localStorage
    const savedCurrentChat = localStorage.getItem('currentChat');
    if (savedCurrentChat) {
      try {
        const parsedCurrentChat = JSON.parse(savedCurrentChat);
        dispatch({ 
          type: 'SET_CURRENT_CHAT', 
          payload: parsedCurrentChat 
        });
        
        // Запрашиваем закрепленные сообщения с задержкой, чтобы socket успел инициализироваться
        const requestPinnedMessages = () => {
          if (window.socket && window.isSocketAuthenticated && parsedCurrentChat.id) {
            console.log('[AppContext] Запрашиваем закрепленные сообщения для восстановленного чата:', parsedCurrentChat.id);
            window.socket.emit('get_pinned_messages', parsedCurrentChat.id);
          } else {
            // Повторяем попытку через 1 секунду
            setTimeout(requestPinnedMessages, 1000);
          }
        };
        
        // Начинаем попытки через 500мс
        setTimeout(requestPinnedMessages, 500);
        
      } catch (error) {
        console.error('Error parsing currentChat data:', error);
        localStorage.removeItem('currentChat');
      }
    }
    // Подписка на событие истории сообщений чата
    if (window.socket) {
      const onChatMessages = ({ chatId, messages }) => {
        console.log('[CLIENT][chat_messages] получено событие', { chatId, messagesCount: messages?.length, messages });
        fetch && fetch('/api/client-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'CLIENT_CHAT_MESSAGES', data: { chatId, messagesCount: messages?.length, messages } })
        });
        dispatch({ type: 'SET_MESSAGES', payload: messages });
      };
      window.socket.on('chat_messages', onChatMessages);
      return () => {
        window.socket.off('chat_messages', onChatMessages);
      };
    }
  }, []);

  // Автоматическое удаление уведомлений через 5 секунд
  useEffect(() => {
    state.notifications.forEach(notification => {
      if (!notification.persistent) {
        setTimeout(() => {
          dispatch({
            type: 'REMOVE_NOTIFICATION',
            payload: { id: notification.id }
          });
        }, 5000);
      }
    });
  }, [state.notifications]);

  // Закрытие панели эмодзи при клике вне её
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (state.showEmojiPicker && 
          !event.target.closest('.emoji-picker') && 
          !event.target.closest('.emoji-btn')) {
        dispatch({ type: 'CLOSE_EMOJI_PICKER' });
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [state.showEmojiPicker]);

  const value = {
    state,
    dispatch
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};