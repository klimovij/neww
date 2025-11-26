import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiSettings, FiSave, FiRotateCcw, FiTrash2, FiCheckSquare, FiSquare, FiRefreshCw } from 'react-icons/fi';
import axios from 'axios';
import { syncEmojisToServer } from '../utils/emojiSync.js';

// Импорт эмодзи для превью - ОЧИЩЕНО
const SMILE_IMAGES = [];

function mapIconNameToEmoji(fileName) {
  // Все эмодзи очищены - функция возвращает пустую строку
  return '';
}

const EMOJI_TO_ICON = SMILE_IMAGES.reduce((acc, img) => {
  const emoji = mapIconNameToEmoji(img.name);
  if (!acc[emoji]) acc[emoji] = img.src;
  return acc;
}, {});

const DEFAULT_SETTINGS = {
  customEmojiSize: 56,
  standardEmojiSize: 1.6,
  customEmojiInPicker: 64,
  standardEmojiInPicker: 32,
  customEmojiInModal: 48,
  standardEmojiInModal: 1.2,
  showStandardEmojis: true,
  customEmojiInNews: 48,
  customEmojiInNewsComments: 48,
  customEmojiInCongrats: 48,
  customEmojiInCongratsComments: 48,
  customEmojiInChatModal: 48,
  emojiOnlySize: 64
};

function getCustomEmojis() {
  try {
    return JSON.parse(localStorage.getItem('customEmojis') || '[]');
  } catch {
    return [];
  }
}

function setCustomEmojis(arr) {
  localStorage.setItem('customEmojis', JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent('customEmojisUpdated', { detail: arr }));
}

function getEmojiBlacklist() {
  try {
    return JSON.parse(localStorage.getItem('emojiBlacklist') || '[]');
  } catch {
    return [];
  }
}

function setEmojiBlacklist(arr) {
  localStorage.setItem('emojiBlacklist', JSON.stringify(arr));
  window.dispatchEvent(new CustomEvent('emojiBlacklistUpdated', { detail: arr }));
}

export default function EmojiSettingsMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [customEmojis, setCustomEmojisState] = useState(getCustomEmojis());
  const [newEmojiFile, setNewEmojiFile] = useState(null);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [uploadToServer, setUploadToServer] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [stdSelectedKeys, setStdSelectedKeys] = useState(new Set());
  const [blacklist, setBlacklist] = useState(getEmojiBlacklist());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('emojiSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Error loading emoji settings:', error);
      }
    }
  }, []);

  const normalize = (arr) => (Array.isArray(arr) ? arr.map(e => ({ name: e.name, src: e.src || e.url })) : []);

  const loadAllEmojis = async () => {
    const local = normalize(getCustomEmojis());
    try {
      const res = await fetch('/api/emojis/list');
      const fromServer = normalize(await res.json());
      const map = new Map();
      [...local, ...fromServer].forEach(e => map.set(`${e.name}|${e.src}`, e));
      setCustomEmojisState(Array.from(map.values()));
    } catch (_) {
      setCustomEmojisState(local);
    }
  };

  useEffect(() => {
    if (open) loadAllEmojis();
    const handler = () => loadAllEmojis();
    window.addEventListener('customEmojisUpdated', handler);
    return () => window.removeEventListener('customEmojisUpdated', handler);
  }, [open]);

  const getEmojiKey = (e) => `${e.name}|${e.src}`;

  const standardItems = SMILE_IMAGES.map(img => ({
    key: `std|${mapIconNameToEmoji(img.name)}`,
    emoji: mapIconNameToEmoji(img.name),
    name: img.name,
    src: img.src
  }));
  const visibleStandardItems = standardItems.filter(i => !(blacklist || []).includes(i.key));

  const isAllSelected = customEmojis.length > 0 && customEmojis.every(e => selectedKeys.has(getEmojiKey(e)));
  const selectedCount = Array.from(selectedKeys).filter(k => customEmojis.some(e => getEmojiKey(e) === k)).length;

  const toggleSelectOne = (key) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys(prev => {
      if (isAllSelected) return new Set();
      return new Set(customEmojis.map(getEmojiKey));
    });
  };

  const stdIsAllSelected = visibleStandardItems.length > 0 && visibleStandardItems.every(i => stdSelectedKeys.has(i.key));
  const stdSelectedCount = Array.from(stdSelectedKeys).filter(k => visibleStandardItems.some(i => i.key === k));
  const toggleStdSelectAll = () => {
    setStdSelectedKeys(prev => {
      if (stdIsAllSelected) return new Set();
      return new Set(visibleStandardItems.map(i => i.key));
    });
  };

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: parseFloat(value) || 0 };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = () => {
    localStorage.setItem('emojiSettings', JSON.stringify(settings));
    setHasChanges(false);
    window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: settings }));
    alert('Настройки эмодзи сохранены!');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  const handleForceEmojiSizeUpdate = () => {
    const newSettings = { ...settings, emojiOnlySize: 64 };
    setSettings(newSettings);
    localStorage.setItem('emojiSettings', JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: newSettings }));
    alert('Размер одиночных эмодзи установлен на 64px для всех пользователей!');
  };

  const handleAddEmoji = async (e) => {
    e.preventDefault();
    if (!newEmojiFile || !newEmojiName.trim()) return;
    setIsAdding(true);

    if (uploadToServer) {
      try {
        const formData = new FormData();
        formData.append('emoji', newEmojiFile);
        formData.append('name', newEmojiName.trim());
        const token = localStorage.getItem('token');
        const res = await axios.post('/api/custom-emoji', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        // Сохраняем data URL перед загрузкой на сервер
        const reader = new FileReader();
        reader.onload = function (evt) {
          const arr = getCustomEmojis();
          arr.push({
            name: res.data.name,
            src: res.data.url,
            dataUrl: evt.target.result // Сохраняем исходный data URL
          });
          setCustomEmojis(arr);
          setCustomEmojisState(getCustomEmojis());
        };
        reader.readAsDataURL(newEmojiFile);
        setCustomEmojisState(getCustomEmojis());
        setNewEmojiFile(null);
        setNewEmojiName('');
        setIsAdding(false);
      } catch (err) {
        alert('Ошибка загрузки эмодзи: ' + (err?.response?.data?.error || err.message));
        setIsAdding(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = function (evt) {
        const arr = getCustomEmojis();
        arr.push({
          name: newEmojiName.trim(),
          src: evt.target.result
        });
        setCustomEmojis(arr);
        setCustomEmojisState(getCustomEmojis());
        setNewEmojiFile(null);
        setNewEmojiName('');
        setIsAdding(false);
      };
      reader.readAsDataURL(newEmojiFile);
    }
  };

  const handleRemoveEmoji = async (itemKey) => {
    const local = getCustomEmojis();
    const remainingLocal = local.filter(e => `${e.name}|${e.src}` !== itemKey);
    if (remainingLocal.length !== local.length) {
      setCustomEmojis(remainingLocal);
    }
    try {
      const src = (customEmojis.find(e => `${e.name}|${e.src}` === itemKey) || {}).src;
      const m = String(src || '').match(/\/uploads\/emojis\/([^/?#]+)/);
      const fname = m && m[1];
      if (fname) {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/custom-emoji/${fname}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('customEmojisUpdated'));
  };

  const handleBulkDelete = async () => {
    const currentMerged = customEmojis;
    const toDelete = currentMerged.filter(e => selectedKeys.has(getEmojiKey(e)));
    if (toDelete.length === 0) return;

    const currentLocal = getCustomEmojis();
    const remainingLocal = currentLocal.filter(e => !selectedKeys.has(getEmojiKey({ name: e.name, src: e.src })));
    if (remainingLocal.length !== currentLocal.length) {
      setCustomEmojis(remainingLocal);
    }

    try {
      const token = localStorage.getItem('token');
      await Promise.all(
        toDelete.map(async (item) => {
          try {
            const m = String(item.src || '').match(/\/uploads\/emojis\/([^/?#]+)/);
            const fname = m && m[1];
            if (fname) {
              await axios.delete(`/api/custom-emoji/${fname}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {}
              });
            }
          } catch (_) {}
        })
      );
    } finally {
      window.dispatchEvent(new CustomEvent('customEmojisUpdated'));
      setSelectedKeys(new Set());
    }
  };

  const handleStdDelete = () => {
    const keys = Array.from(stdSelectedKeys);
    if (keys.length === 0) return;
    const next = Array.from(new Set([...(blacklist || []), ...keys]));
    setBlacklist(next);
    setEmojiBlacklist(next);
    setStdSelectedKeys(new Set());
    alert('Выбранные стандартные эмодзи удалены из приложения (фактически отключены).');
  };

  const getPreviewEmoji = () => {
    const customEmoji = EMOJI_TO_ICON['👍'] || EMOJI_TO_ICON['🏆'];
    return customEmoji;
  };

  // Синхронизация локальных эмодзи с сервером
  const handleSyncEmojis = async () => {
    setIsSyncing(true);
    try {
      // Показываем начальное сообщение
      const localEmojis = JSON.parse(localStorage.getItem('customEmojis') || '[]');
      if (!Array.isArray(localEmojis) || localEmojis.length === 0) {
        alert('❌ Нет локальных эмодзи для синхронизации.\n\nДобавьте эмодзи через форму выше, затем синхронизируйте.');
        setIsSyncing(false);
        return;
      }
      
      const token = localStorage.getItem('token');
      if (!token) {
        alert('❌ Ошибка: вы не авторизованы.\n\nПожалуйста, перезайдите в приложение.');
        setIsSyncing(false);
        return;
      }
      
      // Показываем прогресс
      const dataUrlEmojis = localEmojis.filter(e => e.src && e.src.startsWith('data:'));
      const otherEmojis = localEmojis.filter(e => e.src && !e.src.startsWith('data:') && !e.src.startsWith('/uploads/') && !e.src.startsWith('http'));
      const alreadyOnServer = localEmojis.filter(e => e.src && (e.src.startsWith('/uploads/') || e.src.startsWith('http')));
      
      console.log('📊 Статистика эмодзи:', {
        total: localEmojis.length,
        dataUrl: dataUrlEmojis.length,
        other: otherEmojis.length,
        alreadyOnServer: alreadyOnServer.length
      });
      
      if (dataUrlEmojis.length === 0 && otherEmojis.length === 0) {
        alert(`ℹ️ Все эмодзи уже на сервере.\n\nЛокальных эмодзи: ${localEmojis.length}\nУже на сервере: ${alreadyOnServer.length}\n\nНо папка на сервере пустая! Возможно, нужно принудительная синхронизация.`);
        setIsSyncing(false);
        return;
      }
      
      alert(`🔄 Начинаю синхронизацию...\n\nЛокальных эмодзи: ${localEmojis.length}\nС data URL (base64): ${dataUrlEmojis.length}\nДругих для загрузки: ${otherEmojis.length}\nУже на сервере: ${alreadyOnServer.length}`);
      
      const result = await syncEmojisToServer();
      
      console.log('📊 Результат синхронизации:', result);
      
      if (result.error) {
        if (result.error === 'Нет эмодзи для синхронизации') {
          alert(`ℹ️ Все эмодзи уже на сервере.\n\nНо папка на сервере пустая!\n\nВозможно, нужно принудительно перезагрузить.\n\nЛокальных эмодзи: ${localEmojis.length}\nПропущено: ${result.skipped || 0}`);
        } else {
          alert(`❌ Ошибка синхронизации:\n\n${result.error}\n\nПроверьте подключение к интернету и попробуйте снова.`);
        }
      } else if (result.synced === 0 && result.skipped > 0) {
        alert(`✅ Все эмодзи уже синхронизированы!\n\nПропущено: ${result.skipped}\n(Все эмодзи уже были на сервере)`);
      } else {
        await loadAllEmojis();
        const message = `✅ Синхронизация завершена!\n\n` +
          `📤 Загружено на сервер: ${result.synced}\n` +
          `⏭️ Пропущено (уже были): ${result.skipped}\n` +
          (result.failed > 0 ? `❌ Ошибок: ${result.failed}\n` : '') +
          `\nТеперь эти эмодзи доступны всем пользователям!`;
        alert(message);
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      alert(`❌ Ошибка синхронизации:\n\n${error.message || 'Неизвестная ошибка'}\n\nПроверьте подключение к интернету и попробуйте снова.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Закрываем модалку, возвращаемся в AdminMobile (не в SidebarNav)
      onClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [onClose]);

  const handleClose = useCallback(() => {
    // Закрываем модалку, возвращаемся в AdminMobile (не в SidebarNav)
    onClose();
  }, [onClose]);

  return (
    <>
      {open && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 100003, // Выше AdminMobile (100002)
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}
        onClick={handleClose}
      >
        <div
          ref={modalRef}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingTop: '56px',
            paddingBottom: '20px',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '56px',
              background: 'linear-gradient(135deg, #a3e635 0%, #84cc16 100%)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 10002,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#232931',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
              }}
            >
              <FaArrowLeft />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#232931', fontWeight: 600, fontSize: '18px' }}>
              <FiSettings />
              <span>Управление эмодзи</span>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#232931',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '8px',
              }}
            >
              <FiX />
            </button>
          </div>

          {/* Swipe hint */}
          <div
            style={{
              position: 'fixed',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(163, 230, 53, 0.2)',
              color: '#a3e635',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              zIndex: 10002,
              pointerEvents: 'none',
            }}
          >
            ← Свайп для возврата
          </div>

          {/* Content */}
          <div style={{ padding: '20px 16px', maxWidth: '100%' }}>
            {/* Info Box */}
            <div
              style={{
                background: '#e7f3ff',
                border: '1px solid #b3d9ff',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <p style={{ margin: 0, color: '#004085', fontSize: '14px', lineHeight: 1.5 }}>
                Здесь вы можете настроить размеры отображения эмодзи в разных частях приложения. 
                Изменения применяются сразу после сохранения.<br />
                <b>Добавьте свои эмодзи (PNG, JPG, SVG) с уникальным названием — оно будет использоваться для поиска и отображения.</b>
              </p>
            </div>

            {/* Add Emoji Form */}
            <form
              onSubmit={handleAddEmoji}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '20px',
                padding: '16px',
                background: '#2a2f38',
                borderRadius: '12px',
              }}
            >
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                Файл эмодзи
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={e => setNewEmojiFile(e.target.files?.[0] || null)}
                  required
                  style={{
                    padding: '8px',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    background: '#1a1d24',
                    color: '#e0e0e0',
                    fontSize: '14px',
                  }}
                />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                Название эмодзи
                <input
                  type="text"
                  maxLength={32}
                  placeholder="Например: лайк, победитель"
                  value={newEmojiName}
                  onChange={e => setNewEmojiName(e.target.value)}
                  required
                  style={{
                    padding: '8px',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    background: '#1a1d24',
                    color: '#e0e0e0',
                    fontSize: '14px',
                  }}
                />
              </label>
              <button
                type="submit"
                disabled={!newEmojiFile || !newEmojiName.trim() || isAdding}
                style={{
                  background: isAdding || !newEmojiFile || !newEmojiName.trim() ? '#555' : '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px',
                  fontWeight: 500,
                  cursor: isAdding || !newEmojiFile || !newEmojiName.trim() ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isAdding ? 'Добавление...' : 'Добавить эмодзи'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0e0e0', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={uploadToServer}
                  onChange={e => setUploadToServer(e.target.checked)}
                  style={{ width: '18px', height: '18px' }}
                />
                Загружать эмодзи на сервер (рекомендуется)
              </label>
            </form>
            
            {/* Кнопка синхронизации */}
            <div style={{ marginTop: '15px', marginBottom: '20px' }}>
              <button
                onClick={handleSyncEmojis}
                disabled={isSyncing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 16px',
                  background: isSyncing ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isSyncing ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  opacity: isSyncing ? 0.7 : 1,
                  width: '100%',
                  boxShadow: isSyncing ? 'none' : '0 2px 8px rgba(102, 126, 234, 0.3)'
                }}
                title="Синхронизировать локальные эмодзи с сервером (загрузить те, которых нет на сервере)"
              >
                <FiRefreshCw style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none', fontSize: '16px' }} />
                {isSyncing ? 'Синхронизация...' : 'Синхронизировать с сервером'}
              </button>
              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </div>

            {/* Standard Emojis Section */}
            {visibleStandardItems.length > 0 && (
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '20px',
                }}
              >
                <h4 style={{ margin: '0 0 12px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Стандартные эмодзи (встроенные)
                </h4>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={toggleStdSelectAll}
                      style={{
                        background: 'transparent',
                        border: '1px solid #555',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {stdIsAllSelected ? <FiCheckSquare /> : <FiSquare />} Выбрать все
                    </button>
                    <span style={{ color: '#999', fontSize: '14px' }}>Выбрано: {stdSelectedCount}</span>
                  </div>
                  <button
                    onClick={handleStdDelete}
                    disabled={stdSelectedCount === 0}
                    style={{
                      background: stdSelectedCount === 0 ? '#555' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: stdSelectedCount === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FiTrash2 /> Удалить
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {visibleStandardItems.map((item) => (
                    <div
                      key={item.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#1a1d24',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        padding: '12px',
                        position: 'relative',
                        minWidth: '80px',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={stdSelectedKeys.has(item.key)}
                        onChange={() => setStdSelectedKeys(prev => {
                          const next = new Set(prev);
                          if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
                          return next;
                        })}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          width: '18px',
                          height: '18px',
                        }}
                      />
                      <img src={item.src} alt={item.name} style={{ width: '40px', height: '40px', borderRadius: '4px' }} />
                      <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', wordBreak: 'break-all', textAlign: 'center' }}>
                        {item.emoji}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Emojis Section */}
            {customEmojis.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={toggleSelectAll}
                      style={{
                        background: 'transparent',
                        border: '1px solid #555',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isAllSelected ? <FiCheckSquare /> : <FiSquare />} Выбрать все
                    </button>
                    <span style={{ color: '#999', fontSize: '14px' }}>Выбрано: {selectedCount}</span>
                  </div>
                  <button
                    onClick={handleBulkDelete}
                    disabled={selectedCount === 0}
                    style={{
                      background: selectedCount === 0 ? '#555' : '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      cursor: selectedCount === 0 ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FiTrash2 /> Удалить
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  {customEmojis.map((emoji, idx) => {
                    const key = getEmojiKey(emoji);
                    const checked = selectedKeys.has(key);
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '4px',
                          background: '#1a1d24',
                          border: '1px solid #444',
                          borderRadius: '8px',
                          padding: '12px',
                          position: 'relative',
                          minWidth: '80px',
                        }}
                      >
                        <button
                          onClick={() => handleRemoveEmoji(key)}
                          title="Удалить"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: '#dc3545',
                            fontSize: '16px',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                        >
                          <FiX />
                        </button>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelectOne(key)}
                          style={{
                            position: 'absolute',
                            top: '6px',
                            left: '6px',
                            width: '18px',
                            height: '18px',
                          }}
                        />
                        <img
                          src={emoji.src}
                          alt={emoji.name}
                          style={{ width: '40px', height: '40px', borderRadius: '4px' }}
                        />
                        <span style={{ fontSize: '12px', color: '#999', marginTop: '4px', wordBreak: 'break-all', textAlign: 'center' }}>
                          {emoji.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Settings Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* News and Congrats Section */}
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Размеры в новостях и поздравлениях
                </h4>
                {[
                  { key: 'customEmojiInNews', label: 'Кастомные эмодзи в новостях', desc: 'Размер изображений кастомных эмодзи в блоке новостей', min: 20, max: 200, unit: 'px' },
                  { key: 'customEmojiInNewsComments', label: 'Кастомные эмодзи в комментариях к новостям', desc: 'Размер изображений в комментариях под новостями', min: 20, max: 200, unit: 'px' },
                  { key: 'customEmojiInCongrats', label: 'Кастомные эмодзи в поздравлениях', desc: 'Размер изображений в блоке поздравлений', min: 20, max: 200, unit: 'px' },
                  { key: 'customEmojiInCongratsComments', label: 'Кастомные эмодзи в комментариях к поздравлениям', desc: 'Размер изображений в комментариях под поздравлениями', min: 20, max: 200, unit: 'px' },
                  { key: 'customEmojiInChatModal', label: 'Кастомные эмодзи в модалке чата', desc: 'Размер изображений кастомных эмодзи в модальных окнах чата', min: 20, max: 200, unit: 'px' },
                ].map(({ key, label, desc, min, max, unit }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '12px', color: '#999' }}>{desc}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={settings[key]}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '8px',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            background: '#1a1d24',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#999' }}>{unit}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Chat Section */}
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Размеры в чате
                </h4>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e0e0e0', fontSize: '14px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!settings.showStandardEmojis}
                      onChange={(e) => handleSettingChange('showStandardEmojis', e.target.checked ? 1 : 0)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div>
                      <span style={{ fontWeight: 500 }}>Стандартные эмодзи включены</span>
                      <div style={{ fontSize: '12px', color: '#999' }}>Если выключить — будут отображаться только кастомные</div>
                    </div>
                  </label>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...settings, showStandardEmojis: 0 };
                      setSettings(next);
                      setHasChanges(true);
                      localStorage.setItem('emojiSettings', JSON.stringify(next));
                      window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: next }));
                      alert('Стандартные эмодзи отключены. Теперь видны только кастомные.');
                    }}
                    style={{
                      background: '#ffe082',
                      color: '#232931',
                      border: '1px solid #fcb69f',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      fontWeight: 700,
                      fontSize: '14px',
                      width: '100%',
                    }}
                  >
                    Отключить стандартные
                  </button>
                </div>
                {[
                  { key: 'customEmojiSize', label: 'Кастомные эмодзи под сообщениями', desc: 'Размер изображений кастомных эмодзи в пикселях', min: 20, max: 200, unit: 'px' },
                  { key: 'standardEmojiSize', label: 'Стандартные эмодзи под сообщениями', desc: 'Размер текстовых эмодзи в rem', min: 0.5, max: 5, step: 0.1, unit: 'rem' },
                ].map(({ key, label, desc, min, max, step, unit }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '12px', color: '#999' }}>{desc}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          step={step}
                          value={settings[key]}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '8px',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            background: '#1a1d24',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#999' }}>{unit}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Emoji Only Section */}
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Одиночные эмодзи без пузыря
                </h4>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                    <span style={{ fontWeight: 500 }}>Размер одиночных эмодзи</span>
                    <span style={{ fontSize: '12px', color: '#999' }}>
                      Размер эмодзи, отправленных без текста (отображаются без пузыря сообщения). Минимум 64px для хорошей видимости.
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                      <input
                        type="number"
                        min={64}
                        max={100}
                        value={settings.emojiOnlySize}
                        onChange={(e) => handleSettingChange('emojiOnlySize', e.target.value)}
                        style={{
                          width: '80px',
                          padding: '8px',
                          border: '1px solid #444',
                          borderRadius: '8px',
                          background: '#1a1d24',
                          color: '#e0e0e0',
                          fontSize: '14px',
                          textAlign: 'center',
                        }}
                      />
                      <span style={{ fontSize: '14px', color: '#999' }}>px</span>
                      <button
                        type="button"
                        onClick={handleForceEmojiSizeUpdate}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '14px',
                        }}
                      >
                        Исправить размер
                      </button>
                    </div>
                  </label>
                </div>
              </div>

              {/* Picker Section */}
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Размеры в панели выбора
                </h4>
                {[
                  { key: 'customEmojiInPicker', label: 'Кастомные эмодзи в панели', desc: 'Размер изображений в панели выбора эмодзи', min: 20, max: 200, unit: 'px' },
                  { key: 'standardEmojiInPicker', label: 'Стандартные эмодзи в панели', desc: 'Размер текстовых эмодзи в панели выбора', min: 10, max: 100, unit: 'px' },
                ].map(({ key, label, desc, min, max, unit }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '12px', color: '#999' }}>{desc}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          value={settings[key]}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '8px',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            background: '#1a1d24',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#999' }}>{unit}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {/* Modal Section */}
              <div
                style={{
                  background: '#2a2f38',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                <h4 style={{ margin: '0 0 16px 0', color: '#e0e0e0', fontSize: '16px', fontWeight: 600 }}>
                  Размеры в модальных окнах
                </h4>
                {[
                  { key: 'customEmojiInModal', label: 'Кастомные эмодзи в модалках', desc: 'Размер изображений в модальных окнах', min: 20, max: 200, unit: 'px' },
                  { key: 'standardEmojiInModal', label: 'Стандартные эмодзи в модалках', desc: 'Размер текстовых эмодзи в модальных окнах', min: 0.5, max: 5, step: 0.1, unit: 'rem' },
                ].map(({ key, label, desc, min, max, step, unit }) => (
                  <div key={key} style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#e0e0e0', fontSize: '14px' }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span style={{ fontSize: '12px', color: '#999' }}>{desc}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          step={step}
                          value={settings[key]}
                          onChange={(e) => handleSettingChange(key, e.target.value)}
                          style={{
                            width: '80px',
                            padding: '8px',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            background: '#1a1d24',
                            color: '#e0e0e0',
                            fontSize: '14px',
                            textAlign: 'center',
                          }}
                        />
                        <span style={{ fontSize: '14px', color: '#999' }}>{unit}</span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiRotateCcw /> Сбросить
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                style={{
                  background: !hasChanges ? '#555' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  fontWeight: 500,
                  cursor: !hasChanges ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <FiSave /> Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
      )}
    </>
  );
}

