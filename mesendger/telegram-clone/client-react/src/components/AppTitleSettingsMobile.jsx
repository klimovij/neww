import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiType, FiSave, FiRotateCcw } from 'react-icons/fi';
import frostyImg from '../assets/icons/Frosty.png';

const DEFAULT_SETTINGS = {
  text: 'Issa Plus',
  fontSize: '2em',
  fontFamily: 'Arial, sans-serif',
  customFontUrl: '',
  customFontName: '',
  color: '#43e97b',
  useGradient: false,
  gradientStart: '#43e97b',
  gradientEnd: '#2193b0',
  glowEnabled: true,
  glowColor: '#43e97b',
  glowIntensity: 12,
  glowSpread: 32,
  effectType: 'neon',
  snowEnabled: null,
  snowmanEnabled: false,
  snowmanImage: null,
  snowmanPositionX: 0,
  snowmanPositionY: 0,
  snowmanScale: 100,
  snowmanPositionType: 'relative',
  avatarImage: null,
  avatarPositionX: 0,
  avatarPositionY: 0,
  avatarWidth: 88,
  avatarHeight: 88
};

function getAppTitleSettings() {
  try {
    const saved = localStorage.getItem('appTitleSettings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading app title settings:', e);
  }
  return DEFAULT_SETTINGS;
}

function compressImage(base64String, maxWidth = 300, maxHeight = 300, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      let hasTransparency = false;
      if (base64String.includes('image/png') || base64String.includes('data:image/png')) {
        hasTransparency = true;
      } else {
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = img.width;
          tempCanvas.height = img.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(img, 0, 0);
          const checkWidth = Math.min(img.width, 50);
          const checkHeight = Math.min(img.height, 50);
          const imageData = tempCtx.getImageData(0, 0, checkWidth, checkHeight);
          const data = imageData.data;
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] < 255) {
              hasTransparency = true;
              break;
            }
          }
        } catch (e) {
          hasTransparency = false;
        }
      }
      
      if (!hasTransparency) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }
      
      ctx.drawImage(img, 0, 0, width, height);
      const compressedBase64 = hasTransparency 
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.onerror = reject;
    img.src = base64String;
  });
}

function setAppTitleSettings(settings) {
  try {
    const jsonString = JSON.stringify(settings);
    const sizeInMB = new Blob([jsonString]).size / (1024 * 1024);
    
    if (sizeInMB > 4) {
      console.warn('Размер данных превышает 4MB:', sizeInMB.toFixed(2), 'MB');
      const settingsWithoutImages = {
        ...settings,
        avatarImage: null,
        snowmanImage: null
      };
      localStorage.setItem('appTitleSettings', JSON.stringify(settingsWithoutImages));
      window.dispatchEvent(new CustomEvent('appTitleSettingsUpdated', { detail: settingsWithoutImages }));
      alert('Изображения были удалены из-за превышения лимита localStorage. Попробуйте загрузить изображения меньшего размера.');
    } else {
      localStorage.setItem('appTitleSettings', jsonString);
      window.dispatchEvent(new CustomEvent('appTitleSettingsUpdated', { detail: settings }));
    }
  } catch (error) {
    console.error('Ошибка при сохранении настроек:', error);
    const settingsWithoutImages = {
      ...settings,
      avatarImage: null,
      snowmanImage: null
    };
    try {
      localStorage.setItem('appTitleSettings', JSON.stringify(settingsWithoutImages));
      window.dispatchEvent(new CustomEvent('appTitleSettingsUpdated', { detail: settingsWithoutImages }));
      alert('Изображения были удалены из-за ошибки сохранения. Попробуйте загрузить изображения меньшего размера.');
    } catch (e) {
      console.error('Критическая ошибка: невозможно сохранить настройки', e);
      alert('Ошибка сохранения настроек. Возможно, localStorage переполнен. Попробуйте очистить данные браузера.');
    }
  }
}

function getPresets() {
  try {
    const saved = localStorage.getItem('appTitlePresets');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading presets:', e);
    return [];
  }
}

function savePreset(preset) {
  try {
    const presets = getPresets();
    const existingIndex = presets.findIndex(p => p.id === preset.id);
    
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }
    
    localStorage.setItem('appTitlePresets', JSON.stringify(presets));
    return true;
  } catch (e) {
    console.error('Error saving preset:', e);
    return false;
  }
}

function deletePreset(presetId) {
  try {
    const presets = getPresets();
    const filtered = presets.filter(p => p.id !== presetId);
    localStorage.setItem('appTitlePresets', JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error('Error deleting preset:', e);
    return false;
  }
}

export default function AppTitleSettingsMobile({ open, onClose, onOpenMobileSidebar }) {
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const modalRef = useRef(null);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);

  useEffect(() => {
    if (open) {
      const saved = getAppTitleSettings();
      setSettings(saved);
      setHasChanges(false);
      setPresets(getPresets());
      setPresetName('');
      setShowPresetInput(false);
    }
  }, [open]);

  const handleChange = (key, value) => {
    let processedValue = value;
    if (key === 'glowIntensity' || key === 'glowSpread' || key === 'avatarPositionX' || key === 'avatarPositionY' || key === 'avatarWidth' || key === 'avatarHeight' || key === 'snowmanPositionX' || key === 'snowmanPositionY' || key === 'snowmanScale') {
      const numValue = parseInt(value, 10);
      processedValue = isNaN(numValue) ? 0 : numValue;
    }
    
    const newSettings = { ...settings, [key]: processedValue };
    setSettings(newSettings);
    setHasChanges(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Файл слишком большой. Максимальный размер: 5MB. Файл будет сжат после загрузки.');
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result, 300, 300, 0.75);
          handleChange('avatarImage', compressed);
        } catch (error) {
          console.error('Ошибка при сжатии изображения аватарки:', error);
          alert('Ошибка при обработке изображения. Попробуйте другое изображение.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSnowmanImageUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Файл слишком большой. Максимальный размер: 5MB. Файл будет сжат после загрузки.');
      }
      
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const compressed = await compressImage(reader.result, 300, 300, 0.75);
          handleChange('snowmanImage', compressed);
        } catch (error) {
          console.error('Ошибка при сжатии изображения снеговика:', error);
          alert('Ошибка при обработке изображения. Попробуйте другое изображение.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Введите название пресета');
      return;
    }

    const textSettings = {
      text: settings.text,
      fontSize: settings.fontSize,
      fontFamily: settings.fontFamily,
      customFontUrl: settings.customFontUrl,
      customFontName: settings.customFontName,
      color: settings.color,
      useGradient: settings.useGradient,
      gradientStart: settings.gradientStart,
      gradientEnd: settings.gradientEnd,
      glowEnabled: settings.glowEnabled,
      glowColor: settings.glowColor,
      glowIntensity: settings.glowIntensity,
      glowSpread: settings.glowSpread,
      effectType: settings.effectType
    };

    const preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      settings: textSettings,
      createdAt: new Date().toISOString()
    };

    if (savePreset(preset)) {
      setPresets(getPresets());
      setPresetName('');
      setShowPresetInput(false);
      alert(`Пресет "${preset.name}" сохранен!`);
    } else {
      alert('Ошибка при сохранении пресета');
    }
  };

  const handleApplyPreset = (preset) => {
    const newSettings = {
      ...settings,
      ...preset.settings
    };
    setSettings(newSettings);
    setHasChanges(true);
    alert(`Пресет "${preset.name}" применен!`);
  };

  const handleDeletePreset = (presetId, presetName) => {
    if (window.confirm(`Удалить пресет "${presetName}"?`)) {
      if (deletePreset(presetId)) {
        setPresets(getPresets());
        alert('Пресет удален');
      } else {
        alert('Ошибка при удалении пресета');
      }
    }
  };

  const handleSave = async () => {
    try {
      const settingsToSave = {
        ...settings,
        useGradient: settings.useGradient === true,
        glowEnabled: settings.glowEnabled === true,
        glowIntensity: Number(settings.glowIntensity) || 12,
        glowSpread: Number(settings.glowSpread) || 32,
      };
      
      if (settingsToSave.avatarImage && settingsToSave.avatarImage.startsWith('data:image')) {
        try {
          settingsToSave.avatarImage = await compressImage(settingsToSave.avatarImage, 300, 300, 0.75);
        } catch (error) {
          console.error('Ошибка при сжатии аватарки:', error);
        }
      }
      
      if (settingsToSave.snowmanImage && settingsToSave.snowmanImage.startsWith('data:image')) {
        try {
          settingsToSave.snowmanImage = await compressImage(settingsToSave.snowmanImage, 300, 300, 0.75);
        } catch (error) {
          console.error('Ошибка при сжатии снеговика:', error);
        }
      }
      
      setAppTitleSettings(settingsToSave);
      setHasChanges(false);
      alert('Настройки названия приложения сохранены!');
      onClose();
    } catch (error) {
      console.error('Ошибка при сохранении:', error);
      alert('Ошибка при сохранении настроек. Попробуйте еще раз или удалите изображения.');
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  useEffect(() => {
    if (settings.customFontUrl) {
      const existingLink = document.querySelector(`link[data-custom-font="${settings.customFontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = settings.customFontUrl;
        link.setAttribute('data-custom-font', settings.customFontUrl);
        document.head.appendChild(link);
      }
    }
  }, [settings.customFontUrl]);

  const getPreviewStyle = () => {
    const style = {
      fontSize: settings.fontSize || '2em',
      fontFamily: settings.customFontName ? `"${settings.customFontName}", ${settings.fontFamily}` : settings.fontFamily,
      marginTop: 2,
    };

    const effectType = settings.effectType || 'neon';
    if (settings.useGradient === true && effectType !== 'gradient-animation') {
      const gradientStart = settings.gradientStart || '#43e97b';
      const gradientEnd = settings.gradientEnd || '#2193b0';
      style.background = `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)`;
      style.WebkitBackgroundClip = 'text';
      style.WebkitTextFillColor = 'transparent';
      style.backgroundClip = 'text';
      style.color = 'transparent';
    } else if (effectType === 'gradient-animation' && settings.glowEnabled) {
      style.color = 'transparent';
    } else {
      style.color = settings.color || '#43e97b';
      style.background = 'none';
      style.WebkitBackgroundClip = 'unset';
      style.WebkitTextFillColor = 'unset';
      style.backgroundClip = 'unset';
    }

    const glowColor = settings.glowColor ? String(settings.glowColor).trim() : '#43e97b';
    const intensity = Number(settings.glowIntensity) || 12;
    const spread = Number(settings.glowSpread) || 32;

    if (settings.glowEnabled === true) {
      switch (effectType) {
        case 'shadow':
          style.textShadow = `3px 3px 6px rgba(0,0,0,0.5), 0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}`;
          break;
        case 'outline':
          style.textShadow = `-1px -1px 0 ${glowColor}, 1px -1px 0 ${glowColor}, -1px 1px 0 ${glowColor}, 1px 1px 0 ${glowColor}, 0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}`;
          break;
        case 'sparkle':
          style.textShadow = `0 0 ${intensity}px ${glowColor}, 0 0 ${spread}px ${glowColor}, 0 0 ${spread * 1.5}px ${glowColor}, 2px 2px 4px rgba(0,0,0,0.3), -2px -2px 4px ${glowColor}88`;
          break;
        case 'gradient-animation':
        case 'new-year':
        case 'neon':
        default:
          break;
      }
    } else {
      style.textShadow = 'none';
    }

    return style;
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
      if (onOpenMobileSidebar) {
        onOpenMobileSidebar();
      }
      onClose();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  }, [onClose, onOpenMobileSidebar]);

  const handleClose = useCallback(() => {
    if (onOpenMobileSidebar) {
      onOpenMobileSidebar();
    }
    onClose();
  }, [onClose, onOpenMobileSidebar]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 10001,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#232931', fontWeight: 600, fontSize: '16px' }}>
              <FiType />
              <span>Управление названием</span>
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
            {/* Text */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Текст названия
              </label>
              <input
                type="text"
                value={settings.text}
                onChange={(e) => handleChange('text', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  background: '#1a1d24',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="Введите название приложения"
              />
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Размер шрифта
              </label>
              <input
                type="text"
                value={settings.fontSize}
                onChange={(e) => handleChange('fontSize', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  background: '#1a1d24',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="Например: 2em, 32px, 2rem"
              />
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Примеры: 1.5em, 24px, 2rem
              </div>
            </div>

            {/* Font Family */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Шрифт
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => handleChange('fontFamily', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  background: '#1a1d24',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  marginBottom: '12px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="'Times New Roman', serif">Times New Roman</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                <option value="Impact, sans-serif">Impact</option>
                <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                <option value="'Roboto', sans-serif">Roboto</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
              </select>
              
              <div style={{ marginTop: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#e0e0e0', fontSize: '13px' }}>
                  Загрузить шрифт из интернета (опционально)
                </label>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Например, для Google Fonts: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap
                </div>
                <input
                  type="text"
                  value={settings.customFontUrl || ''}
                  onChange={(e) => handleChange('customFontUrl', e.target.value)}
                  placeholder="URL шрифта (CSS файл)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    background: '#1a1d24',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                  }}
                />
                <input
                  type="text"
                  value={settings.customFontName || ''}
                  onChange={(e) => handleChange('customFontName', e.target.value)}
                  placeholder="Название шрифта (например: Roboto, Montserrat)"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    background: '#1a1d24',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Укажите название шрифта точно так, как оно указано в CSS файле
                </div>
              </div>
            </div>

            {/* Use Gradient */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#e0e0e0', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.useGradient}
                  onChange={(e) => handleChange('useGradient', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Использовать градиент
              </label>
            </div>

            {/* Color (if gradient disabled) */}
            {!settings.useGradient && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                  Цвет текста
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={{
                      width: '60px',
                      height: '40px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="text"
                    value={settings.color}
                    onChange={(e) => handleChange('color', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      background: '#1a1d24',
                      color: '#e0e0e0',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                    placeholder="#43e97b"
                  />
                </div>
              </div>
            )}

            {/* Gradient (if enabled) */}
            {settings.useGradient && (
              <>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                    Начальный цвет градиента
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={settings.gradientStart || '#43e97b'}
                      onChange={(e) => handleChange('gradientStart', e.target.value)}
                      style={{
                        width: '60px',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <input
                      type="text"
                      value={settings.gradientStart || '#43e97b'}
                      onChange={(e) => handleChange('gradientStart', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        background: '#1a1d24',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="#43e97b"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                    Конечный цвет градиента
                  </label>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={settings.gradientEnd || '#2193b0'}
                      onChange={(e) => handleChange('gradientEnd', e.target.value)}
                      style={{
                        width: '60px',
                        height: '40px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    />
                    <input
                      type="text"
                      value={settings.gradientEnd || '#2193b0'}
                      onChange={(e) => handleChange('gradientEnd', e.target.value)}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        background: '#1a1d24',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                      placeholder="#2193b0"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Effect Type */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Тип эффекта
              </label>
              <select
                value={settings.effectType || 'neon'}
                onChange={(e) => handleChange('effectType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #444',
                  background: '#1a1d24',
                  color: '#e0e0e0',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              >
                <option value="neon">Неоновое свечение (анимация)</option>
                <option value="shadow">Тень</option>
                <option value="outline">Обводка</option>
                <option value="sparkle">Искры</option>
                <option value="gradient-animation">Градиентная анимация</option>
                <option value="new-year">Новогодняя анимация</option>
              </select>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                Выберите визуальный эффект для текста
              </div>
            </div>

            {/* Glow */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#2a2f38', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#e0e0e0', cursor: 'pointer', marginBottom: '12px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.glowEnabled}
                  onChange={(e) => handleChange('glowEnabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Включить эффект
              </label>
              {settings.glowEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginLeft: '26px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Цвет свечения
                    </label>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input
                        type="color"
                        value={settings.glowColor || '#43e97b'}
                        onChange={(e) => handleChange('glowColor', e.target.value)}
                        style={{
                          width: '60px',
                          height: '40px',
                          borderRadius: '8px',
                          border: '1px solid #444',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                      <input
                        type="text"
                        value={settings.glowColor || '#43e97b'}
                        onChange={(e) => handleChange('glowColor', e.target.value)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '8px',
                          border: '1px solid #444',
                          background: '#1a1d24',
                          color: '#e0e0e0',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                        }}
                        placeholder="#43e97b"
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Интенсивность свечения: {settings.glowIntensity !== undefined ? settings.glowIntensity : 12}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={settings.glowIntensity !== undefined ? settings.glowIntensity : 12}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        handleChange('glowIntensity', value);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Распространение свечения: {settings.glowSpread || 32}px
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={settings.glowSpread !== undefined ? settings.glowSpread : 32}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        handleChange('glowSpread', value);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      <span>0</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Presets */}
            <div style={{ marginTop: '24px', padding: '20px', background: 'rgba(67, 233, 123, 0.05)', borderRadius: '12px', border: '1px solid rgba(67, 233, 123, 0.2)', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <label style={{ fontWeight: 700, color: '#43e97b', fontSize: '16px' }}>
                  💾 Пресеты стилей текста
                </label>
                <button
                  onClick={() => setShowPresetInput(!showPresetInput)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(67, 233, 123, 0.3)',
                    background: showPresetInput ? 'rgba(67, 233, 123, 0.2)' : 'transparent',
                    color: '#43e97b',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {showPresetInput ? '✕ Отмена' : '+ Сохранить пресет'}
                </button>
              </div>

              {showPresetInput && (
                <div style={{ marginBottom: '16px', padding: '16px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                    Название пресета
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSavePreset();
                        }
                      }}
                      placeholder="Например: Неоновый зеленый"
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        background: '#1a1d24',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={handleSavePreset}
                      disabled={!presetName.trim()}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid rgba(67, 233, 123, 0.5)',
                        background: presetName.trim() ? 'rgba(67, 233, 123, 0.2)' : 'rgba(67, 233, 123, 0.05)',
                        color: presetName.trim() ? '#43e97b' : '#6b7280',
                        cursor: presetName.trim() ? 'pointer' : 'not-allowed',
                        fontWeight: 600,
                        fontSize: '14px',
                      }}
                    >
                      Сохранить
                    </button>
                  </div>
                  <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                    Сохранит текущие настройки текста: цвет, градиент, свечение, эффекты, шрифт
                  </div>
                </div>
              )}

              {presets.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {presets.map((preset) => (
                    <div
                      key={preset.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '8px',
                        border: '1px solid rgba(67, 233, 123, 0.1)',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '4px', fontSize: '14px' }}>
                          {preset.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {preset.settings.effectType} • {preset.settings.useGradient ? 'Градиент' : preset.settings.color} • {preset.settings.glowEnabled ? 'Свечение' : 'Без свечения'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleApplyPreset(preset)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(67, 233, 123, 0.3)',
                            background: 'rgba(67, 233, 123, 0.15)',
                            color: '#43e97b',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '13px',
                          }}
                        >
                          Применить
                        </button>
                        <button
                          onClick={() => handleDeletePreset(preset.id, preset.name)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid rgba(231, 76, 60, 0.3)',
                            background: 'rgba(231, 76, 60, 0.15)',
                            color: '#e74c3c',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '13px',
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: '#999', fontSize: '13px' }}>
                  Нет сохраненных пресетов. Сохраните текущие настройки как пресет, чтобы быстро применять их в будущем.
                </div>
              )}
            </div>

            {/* Snow Management */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Управление снегом
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => handleChange('snowEnabled', true)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${settings.snowEnabled === true ? '#43e97b' : '#444'}`,
                    background: settings.snowEnabled === true ? 'rgba(67,233,123,0.15)' : '#1a1d24',
                    color: settings.snowEnabled === true ? '#43e97b' : '#999',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  ❄ Включить снег
                </button>
                <button
                  onClick={() => handleChange('snowEnabled', false)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${settings.snowEnabled === false ? '#e74c3c' : '#444'}`,
                    background: settings.snowEnabled === false ? 'rgba(231,76,60,0.15)' : '#1a1d24',
                    color: settings.snowEnabled === false ? '#e74c3c' : '#999',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  🚫 Выключить снег
                </button>
                <button
                  onClick={() => handleChange('snowEnabled', null)}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: `1px solid ${settings.snowEnabled === null ? '#6dd5ed' : '#444'}`,
                    background: settings.snowEnabled === null ? 'rgba(109,213,237,0.15)' : '#1a1d24',
                    color: settings.snowEnabled === null ? '#6dd5ed' : '#999',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                  }}
                >
                  🔄 Автоматически
                </button>
              </div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                {settings.snowEnabled === true && 'Снег всегда включен'}
                {settings.snowEnabled === false && 'Снег всегда выключен'}
                {settings.snowEnabled === null && 'Снег включается автоматически в зимний сезон (декабрь-февраль)'}
              </div>
            </div>

            {/* Avatar Settings */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#2a2f38', borderRadius: '12px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#e0e0e0', fontSize: '14px' }}>
                Настройка аватарки
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                    Загрузить изображение
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid #444',
                      background: '#1a1d24',
                      color: '#e0e0e0',
                      fontSize: '14px',
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  />
                  {settings.avatarImage && (
                    <button
                      onClick={() => handleChange('avatarImage', null)}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #e74c3c',
                        background: 'rgba(231,76,60,0.15)',
                        color: '#e74c3c',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                      }}
                    >
                      Удалить изображение
                    </button>
                  )}
                </div>
                {settings.avatarImage && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                        Позиция по горизонтали: {settings.avatarPositionX !== undefined ? settings.avatarPositionX : 0}px
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="5"
                        value={settings.avatarPositionX !== undefined ? settings.avatarPositionX : 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          handleChange('avatarPositionX', value);
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <span>-100px (влево)</span>
                        <span>0px (центр)</span>
                        <span>100px (вправо)</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                        Позиция по вертикали: {settings.avatarPositionY !== undefined ? settings.avatarPositionY : 0}px
                      </label>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        step="5"
                        value={settings.avatarPositionY !== undefined ? settings.avatarPositionY : 0}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          handleChange('avatarPositionY', value);
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <span>-100px (вверх)</span>
                        <span>0px (центр)</span>
                        <span>100px (вниз)</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                        Ширина: {settings.avatarWidth !== undefined ? settings.avatarWidth : 88}px
                      </label>
                      <input
                        type="range"
                        min="40"
                        max="200"
                        step="5"
                        value={settings.avatarWidth !== undefined ? settings.avatarWidth : 88}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          handleChange('avatarWidth', value);
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <span>40px</span>
                        <span>88px (по умолчанию)</span>
                        <span>200px</span>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                        Высота: {settings.avatarHeight !== undefined ? settings.avatarHeight : 88}px
                      </label>
                      <input
                        type="range"
                        min="40"
                        max="200"
                        step="5"
                        value={settings.avatarHeight !== undefined ? settings.avatarHeight : 88}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10);
                          handleChange('avatarHeight', value);
                        }}
                        style={{ width: '100%' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                        <span>40px</span>
                        <span>88px (по умолчанию)</span>
                        <span>200px</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Snowman Settings */}
            <div style={{ marginBottom: '20px', padding: '16px', background: '#2a2f38', borderRadius: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, color: '#e0e0e0', cursor: 'pointer', marginBottom: '12px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={settings.snowmanEnabled || false}
                  onChange={(e) => handleChange('snowmanEnabled', e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                Показать снеговика
              </label>
              {settings.snowmanEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '26px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Загрузить изображение снеговика
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSnowmanImageUpload}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        background: '#1a1d24',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        cursor: 'pointer',
                        boxSizing: 'border-box',
                      }}
                    />
                    {settings.snowmanImage && (
                      <button
                        onClick={() => handleChange('snowmanImage', null)}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: '1px solid #e74c3c',
                          background: 'rgba(231,76,60,0.15)',
                          color: '#e74c3c',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '13px',
                        }}
                      >
                        Удалить изображение
                      </button>
                    )}
                    {!settings.snowmanImage && (
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        Если не загружено, будет использовано изображение по умолчанию
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Тип позиционирования
                    </label>
                    <select
                      value={settings.snowmanPositionType || 'relative'}
                      onChange={(e) => handleChange('snowmanPositionType', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid #444',
                        background: '#1a1d24',
                        color: '#e0e0e0',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="relative">Относительно текста</option>
                      <option value="absolute">Абсолютно по блоку</option>
                    </select>
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      {settings.snowmanPositionType === 'relative' ? 'Позиция относительно текста названия' : 'Позиция относительно всего блока сайдбара'}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Позиция по горизонтали: {settings.snowmanPositionX !== undefined ? settings.snowmanPositionX : 0}px
                    </label>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      step="5"
                      value={settings.snowmanPositionX !== undefined ? settings.snowmanPositionX : 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        handleChange('snowmanPositionX', value);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      <span>-300px (влево)</span>
                      <span>0px (центр)</span>
                      <span>300px (вправо)</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Позиция по вертикали: {settings.snowmanPositionY !== undefined ? settings.snowmanPositionY : 0}px
                    </label>
                    <input
                      type="range"
                      min="-300"
                      max="300"
                      step="5"
                      value={settings.snowmanPositionY !== undefined ? settings.snowmanPositionY : 0}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        handleChange('snowmanPositionY', value);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      <span>-300px (вверх)</span>
                      <span>0px (центр)</span>
                      <span>300px (вниз)</span>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Размер: {settings.snowmanScale !== undefined ? settings.snowmanScale : 100}%
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="200"
                      step="5"
                      value={settings.snowmanScale !== undefined ? settings.snowmanScale : 100}
                      onChange={(e) => {
                        const value = parseInt(e.target.value, 10);
                        handleChange('snowmanScale', value);
                      }}
                      style={{ width: '100%' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      <span>50% (меньше)</span>
                      <span>100% (норма)</span>
                      <span>200% (больше)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Preview */}
            <div style={{
              backgroundColor: 'rgba(34, 40, 49, 0.8)',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid rgba(75, 85, 99, 0.3)',
              marginBottom: '20px',
            }}>
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px', fontWeight: 600 }}>Превью сайдбара:</div>
              <div style={{
                padding: '24px 32px 19px 32px',
                borderBottom: '1px solid #232931',
                background: 'linear-gradient(135deg, #232526 0%, #232931 100%)',
                boxShadow: '0 2px 12px rgba(44,62,80,0.10)',
                position: 'relative',
                overflow: 'visible',
                minHeight: '200px',
                borderRadius: '8px',
              }}>
                {settings.snowmanEnabled && settings.snowmanPositionType === 'absolute' && (
                  <img
                    src={settings.snowmanImage || frostyImg}
                    alt="Снеговик"
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${settings.snowmanPositionX || 0}px)`,
                      top: `${settings.snowmanPositionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(settings.snowmanScale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 10,
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  />
                )}
                
                <div style={{
                  padding: '18px 0 8px 0',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.18em',
                  letterSpacing: '0.01em',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span role="img" aria-label="chat">💬</span> Мессенджер
                  </span>
                  {/* Снег в превью */}
                  {settings.snowEnabled !== false && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '200px',
                      pointerEvents: 'none',
                      overflow: 'visible',
                      zIndex: 1
                    }}>
                      {Array.from({ length: 8 }).map((_, index) => (
                        <span
                          key={index}
                          style={{
                            position: 'absolute',
                            top: '-20px',
                            left: `${(index / 8) * 100}%`,
                            color: 'rgba(255, 255, 255, 0.92)',
                            opacity: 0,
                            animationName: 'snowFallPreview',
                            animationIterationCount: 'infinite',
                            animationTimingFunction: 'linear',
                            animationDelay: `${index * 0.45}s`,
                            animationDuration: `${4 + (index % 3)}s`,
                            fontSize: `${12 + (index % 4) * 2}px`,
                            filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.45))',
                            pointerEvents: 'none',
                            ['--snow-x']: `${-30 + (index % 7) * 12}px`,
                            ['--snow-y']: `${140 + (index % 6) * 18}px`
                          }}
                        >
                          ❄
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <style>{`
                    @keyframes neonGlowPreview {
                      0% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${((Number(settings.glowSpread) || 32) * 0.5)}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 2px #fff, 
                                    0 0 ${((Number(settings.glowSpread) || 32) * 0.75)}px ${settings.glowColor || '#43e97b'}88; 
                      }
                      50% { 
                        text-shadow: 0 0 ${((Number(settings.glowIntensity) || 12) * 2)}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 8px #fff, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}cc; 
                      }
                      100% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${((Number(settings.glowSpread) || 32) * 0.5)}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 2px #fff, 
                                    0 0 ${((Number(settings.glowSpread) || 32) * 0.75)}px ${settings.glowColor || '#43e97b'}88; 
                      }
                    }
                    @keyframes gradientAnimation {
                      0% { background-position: 0% 50%; }
                      50% { background-position: 100% 50%; }
                      100% { background-position: 0% 50%; }
                    }
                    @keyframes sparkleAnimationPreview {
                      0%, 100% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}, 
                                    2px 2px 4px rgba(0,0,0,0.3),
                                    -2px -2px 4px ${settings.glowColor || '#43e97b'}88;
                      }
                      25% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}, 
                                    4px 4px 8px rgba(0,0,0,0.3),
                                    -4px -4px 8px ${settings.glowColor || '#43e97b'}cc,
                                    0 0 ${(Number(settings.glowSpread) || 32) * 1.5}px ${settings.glowColor || '#43e97b'};
                      }
                      50% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}, 
                                    2px 2px 4px rgba(0,0,0,0.3),
                                    -2px -2px 4px ${settings.glowColor || '#43e97b'}88;
                      }
                      75% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px ${settings.glowColor || '#43e97b'}, 
                                    0 0 ${Number(settings.glowSpread) || 32}px ${settings.glowColor || '#43e97b'}, 
                                    -4px -4px 8px rgba(0,0,0,0.3),
                                    4px 4px 8px ${settings.glowColor || '#43e97b'}cc,
                                    0 0 ${(Number(settings.glowSpread) || 32) * 1.5}px ${settings.glowColor || '#43e97b'};
                      }
                    }
                    @keyframes newYearAnimationPreview {
                      0% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px #ff0000, 
                                    0 0 ${Number(settings.glowSpread) || 32}px #ff0000, 
                                    0 0 ${(Number(settings.glowSpread) || 32) * 0.5}px #ffd700,
                                    2px 2px 4px rgba(255, 0, 0, 0.5);
                        filter: hue-rotate(0deg);
                      }
                      25% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px #00ff00, 
                                    0 0 ${Number(settings.glowSpread) || 32}px #00ff00, 
                                    0 0 ${(Number(settings.glowSpread) || 32) * 0.5}px #ffd700,
                                    2px 2px 4px rgba(0, 255, 0, 0.5);
                        filter: hue-rotate(90deg);
                      }
                      50% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px #ffd700, 
                                    0 0 ${Number(settings.glowSpread) || 32}px #ffd700, 
                                    0 0 ${(Number(settings.glowSpread) || 32) * 0.5}px #ff0000,
                                    2px 2px 4px rgba(255, 215, 0, 0.5);
                        filter: hue-rotate(180deg);
                      }
                      75% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px #ff1493, 
                                    0 0 ${Number(settings.glowSpread) || 32}px #ff1493, 
                                    0 0 ${(Number(settings.glowSpread) || 32) * 0.5}px #00ff00,
                                    2px 2px 4px rgba(255, 20, 147, 0.5);
                        filter: hue-rotate(270deg);
                      }
                      100% { 
                        text-shadow: 0 0 ${Number(settings.glowIntensity) || 12}px #ff0000, 
                                    0 0 ${Number(settings.glowSpread) || 32}px #ff0000, 
                                    0 0 ${(Number(settings.glowSpread) || 32) * 0.5}px #ffd700,
                                    2px 2px 4px rgba(255, 0, 0, 0.5);
                        filter: hue-rotate(360deg);
                      }
                    }
                    @keyframes snowFallPreview {
                      0% { 
                        transform: translate3d(var(--snow-x, 40px), 0, 0) rotate(0deg); 
                        opacity: 0; 
                      }
                      10% { 
                        opacity: 0.9; 
                      }
                      100% { 
                        transform: translate3d(var(--snow-x, 40px), var(--snow-y, 160px), 0) rotate(360deg); 
                        opacity: 0; 
                      }
                    }
                    .preview-neon-glow {
                      ${(settings.glowEnabled === true && settings.effectType === 'neon') ? 'animation: neonGlowPreview 1.6s infinite alternate;' : ''}
                    }
                    .preview-gradient-animation {
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? 'animation: gradientAnimation 3s ease infinite;' : ''}
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? `background: linear-gradient(-45deg, ${settings.glowColor || '#43e97b'}, ${settings.color || '#43e97b'}, ${settings.glowColor || '#43e97b'}, ${settings.color || '#43e97b'});` : ''}
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? 'background-size: 400% 400%;' : ''}
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? '-webkit-background-clip: text;' : ''}
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? '-webkit-text-fill-color: transparent;' : ''}
                      ${(settings.glowEnabled === true && settings.effectType === 'gradient-animation') ? 'background-clip: text;' : ''}
                    }
                    .preview-sparkle {
                      ${(settings.glowEnabled === true && settings.effectType === 'sparkle') ? 'animation: sparkleAnimationPreview 2s ease-in-out infinite;' : ''}
                    }
                    .preview-new-year {
                      ${(settings.glowEnabled === true && settings.effectType === 'new-year') ? 'animation: newYearAnimationPreview 3s ease-in-out infinite;' : ''}
                    }
                  `}</style>
                  {settings.snowmanEnabled && settings.snowmanPositionType === 'relative' && (
                    <img
                      src={settings.snowmanImage || frostyImg}
                      alt="Снеговик"
                      style={{
                        position: 'absolute',
                        left: `calc(50% + ${settings.snowmanPositionX || 0}px)`,
                        top: `${settings.snowmanPositionY || 0}px`,
                        transform: 'translateX(-50%)',
                        width: `${(settings.snowmanScale || 100) * 0.6}px`,
                        height: 'auto',
                        zIndex: 10,
                        pointerEvents: 'none',
                        userSelect: 'none'
                      }}
                    />
                  )}
                  <span 
                    className={(() => {
                      if (!settings.glowEnabled) return '';
                      const effectType = settings.effectType || 'neon';
                      if (effectType === 'neon') return 'preview-neon-glow';
                      if (effectType === 'gradient-animation') return 'preview-gradient-animation';
                      if (effectType === 'sparkle') return 'preview-sparkle';
                      if (effectType === 'new-year') return 'preview-new-year';
                      return '';
                    })()}
                    key={`preview-${settings.effectType}-${settings.glowColor}-${settings.glowIntensity}-${settings.glowSpread}-${settings.glowEnabled}-${settings.useGradient}-${settings.color}-${settings.fontSize}-${settings.text}-${settings.snowEnabled}-${settings.snowmanEnabled}`}
                    style={(() => {
                      const previewStyle = getPreviewStyle();
                      const finalStyle = {
                        ...previewStyle,
                        display: 'block',
                        fontWeight: 700,
                      };
                      
                      const effectType = settings.effectType || 'neon';
                      if (!settings.glowEnabled) {
                        finalStyle.textShadow = 'none';
                      } else if (effectType === 'neon' || effectType === 'gradient-animation' || effectType === 'sparkle' || effectType === 'new-year') {
                        // Анимация будет управлять textShadow через CSS
                      } else {
                        finalStyle.textShadow = previewStyle.textShadow || 'none';
                      }
                      
                      return finalStyle;
                    })()}
                  >
                    {settings.text || 'Issa Plus'}
                  </span>
                </div>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '16px',
                  textAlign: 'center',
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${settings.avatarWidth || 88}px`,
                    height: `${settings.avatarHeight || 88}px`,
                    borderRadius: '12px',
                    background: settings.avatarImage ? 'transparent' : '#e3eaf2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    color: '#6b7280',
                    border: '2px solid rgba(109, 213, 237, 0.3)',
                    overflow: 'hidden',
                    position: 'relative',
                    left: `${settings.avatarPositionX || 0}px`,
                    top: `${settings.avatarPositionY || 0}px`
                  }}>
                    {settings.avatarImage ? (
                      <img
                        src={settings.avatarImage}
                        alt="Аватарка"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '12px'
                        }}
                      />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  <div style={{
                    fontWeight: 700,
                    color: '#6dd5ed',
                    fontSize: '1.05rem'
                  }}>
                    Пользователь
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid #444',
                  background: '#1a1d24',
                  color: '#e5e7eb',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                <FiRotateCcw style={{ display: 'inline', marginRight: '6px' }} />
                Сбросить
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: '1px solid rgba(67,233,123,0.35)',
                  background: hasChanges ? 'rgba(67,233,123,0.15)' : 'rgba(67,233,123,0.05)',
                  color: hasChanges ? '#b2ffb2' : '#6b7280',
                  cursor: hasChanges ? 'pointer' : 'not-allowed',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                <FiSave style={{ display: 'inline', marginRight: '6px' }} />
                Подтвердить
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

