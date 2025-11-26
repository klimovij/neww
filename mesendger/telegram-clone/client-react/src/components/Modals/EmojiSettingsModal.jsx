import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styled from 'styled-components';
import { FiX, FiSettings, FiSave, FiRotateCcw, FiTrash2, FiCheckSquare, FiSquare, FiRefreshCw } from 'react-icons/fi';
import { Modal, ModalContent, CloseButton } from '../../styles/GlobalStyles';
import axios from 'axios';
import { syncEmojisToServer } from '../../utils/emojiSync';

const ModalTitle = styled.h3`
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const SettingSection = styled.div`
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e9ecef;
`;

const SectionTitle = styled.h4`
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1.1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const SettingLabel = styled.label`
  font-weight: 500;
  color: #495057;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const SettingDescription = styled.span`
  font-size: 0.85rem;
  color: #6c757d;
  font-weight: 400;
`;

const InputGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const NumberInput = styled.input`
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }
`;

const UnitLabel = styled.span`
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
`;

const PreviewContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  margin-top: 0.5rem;
`;

const PreviewLabel = styled.span`
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
  min-width: 80px;
`;

const EmojiPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const CustomEmojiPreview = styled.img`
  border-radius: 4px;
  image-rendering: crisp-edges;
`;

const StandardEmojiPreview = styled.span`
  font-size: 1.2rem;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SaveButton = styled(ActionButton)`
  background: #007bff;
  color: white;
  
  &:hover:not(:disabled) {
    background: #0056b3;
    transform: translateY(-1px);
  }
`;

const ResetButton = styled(ActionButton)`
  background: #6c757d;
  color: white;
  
  &:hover:not(:disabled) {
    background: #545b62;
    transform: translateY(-1px);
  }
`;

const InfoBox = styled.div`
  background: #e7f3ff;
  border: 1px solid #b3d9ff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const InfoText = styled.p`
  margin: 0;
  color: #004085;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const EmojiList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 1rem;
`;

const EmojiItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  position: relative;
`;

const EmojiName = styled.span`
  font-size: 0.85rem;
  color: #495057;
  margin-top: 0.2rem;
  word-break: break-all;
`;

const RemoveEmojiBtn = styled.button`
  position: absolute;
  top: 2px;
  right: 2px;
  background: transparent;
  border: none;
  color: #dc3545;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0;
`;

const SelectEmojiCheckbox = styled.input`
  position: absolute;
  top: 6px;
  left: 6px;
`;

const BulkActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
`;

const InlineGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const DangerButton = styled(ActionButton)`
  background: #dc3545;
  color: white;
  &:hover:not(:disabled) {
    background: #b02a37;
    transform: translateY(-1px);
  }
`;

const AddEmojiForm = styled.form`
  display: flex;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const AddEmojiInput = styled.input`
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 6px;
  font-size: 0.95rem;
`;

const AddEmojiLabel = styled.label`
  font-size: 0.95rem;
  color: #495057;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const AddEmojiBtn = styled.button`
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &:hover:not(:disabled) {
    background: #218838;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

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
  // Новые области использования кастомных эмодзи
  customEmojiInNews: 48,
  customEmojiInNewsComments: 48,
  customEmojiInCongrats: 48,
  customEmojiInCongratsComments: 48,
  customEmojiInChatModal: 48,
  // Размер одиночных эмодзи без пузыря - увеличен для лучшей видимости
  emojiOnlySize: 64
};

function getCustomEmojis() {
  // Сохраняем кастомные эмодзи в localStorage как массив объектов {name, src}
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

// --- Blacklist для встроенных (стандартных) эмодзи ---
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

export default function EmojiSettingsModal({ open, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [customEmojis, setCustomEmojisState] = useState(getCustomEmojis());
  const [newEmojiFile, setNewEmojiFile] = useState(null);
  const [newEmojiName, setNewEmojiName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [uploadToServer, setUploadToServer] = useState(true); // Новый флаг
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [stdSelectedKeys, setStdSelectedKeys] = useState(new Set());
  const [blacklist, setBlacklist] = useState(getEmojiBlacklist());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Загружаем сохраненные настройки из localStorage
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

  // Встроенные (стандартные) эмодзи как элементы списка
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
      const next = new Set(customEmojis.map(getEmojiKey));
      return next;
    });
  };

  const stdIsAllSelected = visibleStandardItems.length > 0 && visibleStandardItems.every(i => stdSelectedKeys.has(i.key));
  const stdSelectedCount = Array.from(stdSelectedKeys).filter(k => visibleStandardItems.some(i => i.key === k)).length;
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
    
    // Отправляем событие об обновлении настроек
    window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { 
      detail: settings 
    }));
    
    alert('Настройки эмодзи сохранены!');
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  // Функция для принудительного обновления размера эмодзи у всех пользователей
  const handleForceEmojiSizeUpdate = () => {
    const newSettings = { ...settings, emojiOnlySize: 64 };
    setSettings(newSettings);
    localStorage.setItem('emojiSettings', JSON.stringify(newSettings));
    
    // Отправляем событие об обновлении настроек
    window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { 
      detail: newSettings 
    }));
    
    alert('Размер одиночных эмодзи установлен на 64px для всех пользователей!');
  };

  // Добавление кастомного эмодзи (с серверной загрузкой)
  const handleAddEmoji = async (e) => {
    e.preventDefault();
    if (!newEmojiFile || !newEmojiName.trim()) return;
    setIsAdding(true);

    if (uploadToServer) {
      // --- Загрузка на сервер ---
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
        const arr = getCustomEmojis();
        arr.push({
          name: res.data.name,
          src: res.data.url
        });
        setCustomEmojis(arr); // Сохраняем в localStorage
        setCustomEmojisState(getCustomEmojis()); // Обновляем состояние из localStorage
        setNewEmojiFile(null);
        setNewEmojiName('');
        setIsAdding(false);
      } catch (err) {
        alert('Ошибка загрузки эмодзи: ' + (err?.response?.data?.error || err.message));
        setIsAdding(false);
      }
    } else {
      // --- Локальное добавление ---
      const reader = new FileReader();
      reader.onload = function (evt) {
        const arr = getCustomEmojis();
        arr.push({
          name: newEmojiName.trim(),
          src: evt.target.result
        });
        setCustomEmojis(arr); // Сохраняем в localStorage
        setCustomEmojisState(getCustomEmojis()); // Обновляем состояние из localStorage
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

    // Удаляем из localStorage те, что там присутствуют
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
          } catch (_) {
            // ignore per item
          }
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

  // Синхронизация локальных эмодзи с сервером
  const handleSyncEmojis = async () => {
    setIsSyncing(true);
    try {
      const result = await syncEmojisToServer();
      if (result.error) {
        alert(`Ошибка синхронизации: ${result.error}`);
      } else {
        await loadAllEmojis();
        alert(`✅ Синхронизация завершена!\nЗагружено: ${result.synced}\nПропущено: ${result.skipped}\nОшибок: ${result.failed || 0}`);
      }
    } catch (error) {
      console.error('Ошибка синхронизации:', error);
      alert(`Ошибка синхронизации: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const getPreviewEmoji = () => {
    const customEmoji = EMOJI_TO_ICON['👍'] || EMOJI_TO_ICON['🏆'];
    return customEmoji;
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <Modal onClick={onClose} style={{ zIndex: 100000 }}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FiX />
        </CloseButton>

        <ModalTitle>
          <FiSettings />
          Управление эмодзи
        </ModalTitle>

        <InfoBox>
          <InfoText>
            Здесь вы можете настроить размеры отображения эмодзи в разных частях приложения. 
            Изменения применяются сразу после сохранения.<br />
            <b>Добавьте свои эмодзи (PNG, JPG, SVG) с уникальным названием — оно будет использоваться для поиска и отображения.</b>
          </InfoText>
        </InfoBox>

        {/* --- Добавление кастомного эмодзи --- */}
        <AddEmojiForm onSubmit={handleAddEmoji}>
          <AddEmojiLabel>
            Файл эмодзи
            <AddEmojiInput
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              onChange={e => setNewEmojiFile(e.target.files?.[0] || null)}
              required
            />
          </AddEmojiLabel>
          <AddEmojiLabel>
            Название эмодзи
            <AddEmojiInput
              type="text"
              maxLength={32}
              placeholder="Например: лайк, победитель"
              value={newEmojiName}
              onChange={e => setNewEmojiName(e.target.value)}
              required
            />
          </AddEmojiLabel>
          <AddEmojiBtn type="submit" disabled={!newEmojiFile || !newEmojiName.trim() || isAdding}>
            Добавить эмодзи
          </AddEmojiBtn>
        </AddEmojiForm>
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={uploadToServer}
              onChange={e => setUploadToServer(e.target.checked)}
              style={{ marginRight: 6 }}
            />
            Загружать эмодзи на сервер (рекомендуется)
          </label>
          <button
            onClick={handleSyncEmojis}
            disabled={isSyncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: isSyncing ? '#6c757d' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.2s',
              opacity: isSyncing ? 0.7 : 1
            }}
            title="Синхронизировать локальные эмодзи с сервером (загрузить те, которых нет на сервере)"
          >
            <FiRefreshCw style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            {isSyncing ? 'Синхронизация...' : 'Синхронизировать с сервером'}
          </button>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        {/* --- Список стандартных эмодзи (встроенные) --- */}
        <SettingSection>
          <SectionTitle>Стандартные эмодзи (встроенные)</SectionTitle>
          <BulkActions>
            <InlineGroup>
              <button onClick={toggleStdSelectAll} style={{ background: 'transparent', border: '1px solid #ced4da', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>
                {stdIsAllSelected ? <FiCheckSquare /> : <FiSquare />} Выбрать все
              </button>
              <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Выбрано: {stdSelectedCount}</span>
            </InlineGroup>
            <DangerButton onClick={handleStdDelete} disabled={stdSelectedCount === 0}>
              <FiTrash2 /> Удалить выбранные
            </DangerButton>
          </BulkActions>
          <EmojiList>
            {visibleStandardItems.map((item) => (
              <EmojiItem key={item.key}>
                <SelectEmojiCheckbox
                  type="checkbox"
                  checked={stdSelectedKeys.has(item.key)}
                  onChange={() => setStdSelectedKeys(prev => {
                    const next = new Set(prev);
                    if (next.has(item.key)) next.delete(item.key); else next.add(item.key);
                    return next;
                  })}
                />
                <CustomEmojiPreview src={item.src} alt={item.name} style={{ width: 40, height: 40 }} />
                <EmojiName>{item.emoji}</EmojiName>
              </EmojiItem>
            ))}
          </EmojiList>
        </SettingSection>

        {/* --- Список кастомных эмодзи --- */}
        {customEmojis.length > 0 && (
          <>
            <BulkActions>
              <InlineGroup>
                <button onClick={toggleSelectAll} style={{ background: 'transparent', border: '1px solid #ced4da', borderRadius: 6, padding: '0.35rem 0.6rem', cursor: 'pointer' }}>
                  {isAllSelected ? <FiCheckSquare /> : <FiSquare />} Выбрать все
                </button>
                <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Выбрано: {selectedCount}</span>
              </InlineGroup>
              <DangerButton onClick={handleBulkDelete} disabled={selectedCount === 0}>
                <FiTrash2 /> Удалить выбранные
              </DangerButton>
            </BulkActions>
            <EmojiList>
              {customEmojis.map((emoji, idx) => {
                const key = getEmojiKey(emoji);
                const checked = selectedKeys.has(key);
                return (
                  <EmojiItem key={idx}>
                    <RemoveEmojiBtn title="Удалить" onClick={() => handleRemoveEmoji(key)}>
                      <FiX />
                    </RemoveEmojiBtn>
                    <SelectEmojiCheckbox
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectOne(key)}
                    />
                    <CustomEmojiPreview
                      src={emoji.src}
                      alt={emoji.name}
                      style={{ width: 40, height: 40 }}
                    />
                    <EmojiName>{emoji.name}</EmojiName>
                  </EmojiItem>
                );
              })}
            </EmojiList>
          </>
        )}

        {/* --- СТАРЫЙ КОД НАСТРОЕК --- */}
        <SettingsContainer>
          <SettingSection>
            <SectionTitle>Размеры в новостях и поздравлениях</SectionTitle>

            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в новостях</span>
                <SettingDescription>Размер изображений кастомных эмодзи в блоке новостей</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInNews}
                  onChange={(e) => handleSettingChange('customEmojiInNews', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в комментариях к новостям</span>
                <SettingDescription>Размер изображений в комментариях под новостями</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInNewsComments}
                  onChange={(e) => handleSettingChange('customEmojiInNewsComments', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в поздравлениях сотрудников</span>
                <SettingDescription>Размер изображений в блоке поздравлений</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInCongrats}
                  onChange={(e) => handleSettingChange('customEmojiInCongrats', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в комментариях к поздравлениям</span>
                <SettingDescription>Размер изображений в комментариях под поздравлениями</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInCongratsComments}
                  onChange={(e) => handleSettingChange('customEmojiInCongratsComments', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в модалке чата переписки</span>
                <SettingDescription>Размер изображений кастомных эмодзи в модальных окнах чата</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInChatModal}
                  onChange={(e) => handleSettingChange('customEmojiInChatModal', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <PreviewContainer>
              <PreviewLabel>Превью:</PreviewLabel>
              <EmojiPreview>
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji preview"
                  style={{ width: settings.customEmojiInNews, height: settings.customEmojiInNews }}
                />
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji preview"
                  style={{ width: settings.customEmojiInNewsComments, height: settings.customEmojiInNewsComments }}
                />
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji preview"
                  style={{ width: settings.customEmojiInCongrats, height: settings.customEmojiInCongrats }}
                />
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji preview"
                  style={{ width: settings.customEmojiInCongratsComments, height: settings.customEmojiInCongratsComments }}
                />
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji preview"
                  style={{ width: settings.customEmojiInChatModal, height: settings.customEmojiInChatModal }}
                />
              </EmojiPreview>
            </PreviewContainer>
          </SettingSection>
          <SettingSection>
            <SectionTitle>Размеры в чате</SectionTitle>
            <SettingRow>
              <SettingLabel>
                <span>Стандартные эмодзи включены</span>
                <SettingDescription>Если выключить — будут отображаться только кастомные</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <input
                  type="checkbox"
                  checked={!!settings.showStandardEmojis}
                  onChange={(e) => handleSettingChange('showStandardEmojis', e.target.checked ? 1 : 0)}
                />
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Отключить все стандартные эмодзи в приложении</span>
                <SettingDescription>Применяется в чатах, новостях и комментариях</SettingDescription>
              </SettingLabel>
              <InputGroup>
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
                  style={{ background: '#ffe082', color: '#232931', border: '1px solid #fcb69f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontWeight: 700 }}
                >
                  Отключить стандартные
                </button>
              </InputGroup>
            </SettingRow>
            
            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи под сообщениями</span>
                <SettingDescription>Размер изображений кастомных эмодзи в пикселях</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiSize}
                  onChange={(e) => handleSettingChange('customEmojiSize', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Стандартные эмодзи под сообщениями</span>
                <SettingDescription>Размер текстовых эмодзи в rem</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.standardEmojiSize}
                  onChange={(e) => handleSettingChange('standardEmojiSize', e.target.value)}
                />
                <UnitLabel>rem</UnitLabel>
              </InputGroup>
            </SettingRow>

            <PreviewContainer>
              <PreviewLabel>Превью:</PreviewLabel>
              <EmojiPreview>
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Custom emoji"
                  style={{ 
                    width: settings.customEmojiSize, 
                    height: settings.customEmojiSize 
                  }}
                />
                {settings.showStandardEmojis !== false && (
                  <StandardEmojiPreview style={{ fontSize: `${settings.standardEmojiSize}rem` }}>
                    😊
                  </StandardEmojiPreview>
                )}
              </EmojiPreview>
            </PreviewContainer>
          </SettingSection>

          <SettingSection>
            <SectionTitle>Одиночные эмодзи без пузыря</SectionTitle>
            
            <SettingRow>
              <SettingLabel>
                <span>Размер одиночных эмодзи</span>
                <SettingDescription>Размер эмодзи, отправленных без текста (отображаются без пузыря сообщения). Минимум 64px для хорошей видимости.</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="64"
                  max="100"
                  value={settings.emojiOnlySize}
                  onChange={(e) => handleSettingChange('emojiOnlySize', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
                <button
                  type="button"
                  onClick={handleForceEmojiSizeUpdate}
                  style={{ 
                    background: '#28a745', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '6px', 
                    padding: '0.5rem 1rem', 
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    marginLeft: '0.5rem'
                  }}
                  title="Установить размер 64px для всех пользователей"
                >
                  Исправить размер
                </button>
              </InputGroup>
            </SettingRow>

            <PreviewContainer>
              <PreviewLabel>Превью одиночного эмодзи:</PreviewLabel>
              <EmojiPreview>
                <CustomEmojiPreview
                  src={getPreviewEmoji()}
                  alt="Emoji only preview"
                  style={{ 
                    width: settings.emojiOnlySize, 
                    height: settings.emojiOnlySize,
                    borderRadius: '12px'
                  }}
                />
                <StandardEmojiPreview style={{ fontSize: `${settings.emojiOnlySize / 16}rem` }}>
                  😊
                </StandardEmojiPreview>
              </EmojiPreview>
            </PreviewContainer>
          </SettingSection>

          <SettingSection>
            <SectionTitle>Размеры в панели выбора</SectionTitle>
            
            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в панели</span>
                <SettingDescription>Размер изображений в панели выбора эмодзи</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInPicker}
                  onChange={(e) => handleSettingChange('customEmojiInPicker', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Стандартные эмодзи в панели</span>
                <SettingDescription>Размер текстовых эмодзи в панели выбора</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="10"
                  max="100"
                  value={settings.standardEmojiInPicker}
                  onChange={(e) => handleSettingChange('standardEmojiInPicker', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>
          </SettingSection>

          <SettingSection>
            <SectionTitle>Размеры в модальных окнах</SectionTitle>
            
            <SettingRow>
              <SettingLabel>
                <span>Кастомные эмодзи в модалках</span>
                <SettingDescription>Размер изображений в модальных окнах</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="20"
                  max="200"
                  value={settings.customEmojiInModal}
                  onChange={(e) => handleSettingChange('customEmojiInModal', e.target.value)}
                />
                <UnitLabel>px</UnitLabel>
              </InputGroup>
            </SettingRow>

            <SettingRow>
              <SettingLabel>
                <span>Стандартные эмодзи в модалках</span>
                <SettingDescription>Размер текстовых эмодзи в модальных окнах</SettingDescription>
              </SettingLabel>
              <InputGroup>
                <NumberInput
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={settings.standardEmojiInModal}
                  onChange={(e) => handleSettingChange('standardEmojiInModal', e.target.value)}
                />
                <UnitLabel>rem</UnitLabel>
              </InputGroup>
            </SettingRow>
          </SettingSection>
        </SettingsContainer>

        <ButtonGroup>
          <ResetButton onClick={handleReset}>
            <FiRotateCcw />
            Сбросить
          </ResetButton>
          <SaveButton onClick={handleSave} disabled={!hasChanges}>
            <FiSave />
            Сохранить
          </SaveButton>
        </ButtonGroup>
      </ModalContent>
    </Modal>,
    document.body
  );
}

