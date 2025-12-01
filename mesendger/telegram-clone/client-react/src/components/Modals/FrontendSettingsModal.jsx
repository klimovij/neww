import React, { useState, useEffect } from 'react';
import { FiX, FiMonitor, FiImage, FiType } from 'react-icons/fi';

const DEFAULT_SETTINGS = {
  // Основной фон
  mainBackground: '#111827',
  mainBackgroundImage: '',
  mainBackgroundImageOpacity: 1,
  
  // Фон модалок
  modalBackground: '#1f2937',
  modalBackgroundImage: '',
  modalBackgroundImageOpacity: 1,
  
  // Сайдбар
  sidebarButtonBackground: '#3b82f6',
  sidebarButtonBackgroundImage: '',
  sidebarButtonBackgroundImageOpacity: 0.1,
  sidebarTextColor: '#ffffff',
  sidebarTextSize: '14px',
  sidebarFontFamily: 'Inter, system-ui, -apple-system, sans-serif',
};

// Функция для загрузки изображения и конвертации в Base64
const loadImageAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function FrontendSettingsModal({ open, onClose }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Загрузка настроек при открытии
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('frontendSettings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (error) {
          console.error('Ошибка загрузки настроек:', error);
        }
      }
      setHasChanges(false);
    }
  }, [open]);

  // Применение настроек к DOM
  useEffect(() => {
    if (!open) return;

    // Применяем основной фон
    document.documentElement.style.setProperty('--main-background', settings.mainBackground);
    
    // Применяем изображение фона
    if (settings.mainBackgroundImage) {
      document.documentElement.style.setProperty('--main-background-image', `url(${settings.mainBackgroundImage})`);
      document.documentElement.style.setProperty('--main-background-image-opacity', settings.mainBackgroundImageOpacity);
    } else {
      document.documentElement.style.setProperty('--main-background-image', 'none');
    }
    
    // Применяем фон модалок
    document.documentElement.style.setProperty('--modal-background', settings.modalBackground);
    if (settings.modalBackgroundImage) {
      document.documentElement.style.setProperty('--modal-background-image', `url(${settings.modalBackgroundImage})`);
      document.documentElement.style.setProperty('--modal-background-image-opacity', settings.modalBackgroundImageOpacity);
    } else {
      document.documentElement.style.setProperty('--modal-background-image', 'none');
    }
    
    // Применяем стили сайдбара
    const buttonBg = settings.sidebarButtonBackgroundImage 
      ? `url(${settings.sidebarButtonBackgroundImage})`
      : settings.sidebarButtonBackground;
    document.documentElement.style.setProperty('--sidebar-button-background', buttonBg);
    document.documentElement.style.setProperty('--sidebar-button-background-opacity', settings.sidebarButtonBackgroundImageOpacity);
    document.documentElement.style.setProperty('--sidebar-text-color', settings.sidebarTextColor);
    document.documentElement.style.setProperty('--sidebar-text-size', settings.sidebarTextSize);
    document.documentElement.style.setProperty('--sidebar-font-family', settings.sidebarFontFamily);
  }, [open, settings]);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Размер файла не должен превышать 5 МБ');
      return;
    }

    try {
      const base64 = await loadImageAsBase64(file);
      handleChange('mainBackgroundImage', base64);
    } catch (error) {
      console.error('Ошибка загрузки изображения:', error);
      alert('Ошибка загрузки изображения');
    }
  };

  const handleSave = () => {
    try {
      localStorage.setItem('frontendSettings', JSON.stringify(settings));
      
      // Применяем настройки глобально
      document.documentElement.style.setProperty('--main-background', settings.mainBackground);
      
      if (settings.mainBackgroundImage) {
        document.documentElement.style.setProperty('--main-background-image', `url(${settings.mainBackgroundImage})`);
        document.documentElement.style.setProperty('--main-background-image-opacity', settings.mainBackgroundImageOpacity);
      } else {
        document.documentElement.style.setProperty('--main-background-image', 'none');
      }
      
      document.documentElement.style.setProperty('--modal-background', settings.modalBackground);
      if (settings.modalBackgroundImage) {
        document.documentElement.style.setProperty('--modal-background-image', `url(${settings.modalBackgroundImage})`);
        document.documentElement.style.setProperty('--modal-background-image-opacity', settings.modalBackgroundImageOpacity);
      } else {
        document.documentElement.style.setProperty('--modal-background-image', 'none');
      }
      
      const buttonBg = settings.sidebarButtonBackgroundImage 
        ? `url(${settings.sidebarButtonBackgroundImage})`
        : settings.sidebarButtonBackground;
      document.documentElement.style.setProperty('--sidebar-button-background', buttonBg);
      document.documentElement.style.setProperty('--sidebar-button-background-opacity', settings.sidebarButtonBackgroundImageOpacity);
      document.documentElement.style.setProperty('--sidebar-text-color', settings.sidebarTextColor);
      document.documentElement.style.setProperty('--sidebar-text-size', settings.sidebarTextSize);
      document.documentElement.style.setProperty('--sidebar-font-family', settings.sidebarFontFamily);
      
      setHasChanges(false);
      alert('✅ Настройки сохранены!');
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('❌ Ошибка сохранения настроек');
    }
  };

  const handleReset = () => {
    if (!window.confirm('⚠️ Вы уверены, что хотите сбросить ВСЕ настройки к значениям по умолчанию?\n\nЭто действие нельзя отменить!')) {
      return;
    }
    
    try {
      // Удаляем все сохраненные настройки
      localStorage.removeItem('frontendSettings');
      
      // Очищаем ВСЕ CSS переменные
      document.documentElement.style.removeProperty('--main-background');
      document.documentElement.style.removeProperty('--main-background-image');
      document.documentElement.style.removeProperty('--main-background-image-opacity');
      document.documentElement.style.removeProperty('--modal-background');
      document.documentElement.style.removeProperty('--modal-background-image');
      document.documentElement.style.removeProperty('--modal-background-image-opacity');
      document.documentElement.style.removeProperty('--sidebar-button-background');
      document.documentElement.style.removeProperty('--sidebar-button-background-opacity');
      document.documentElement.style.removeProperty('--sidebar-text-color');
      document.documentElement.style.removeProperty('--sidebar-text-size');
      document.documentElement.style.removeProperty('--sidebar-font-family');
      
      // Применяем дефолтные настройки
      setSettings(DEFAULT_SETTINGS);
      
      // Применяем дефолтные значения к DOM
      document.documentElement.style.setProperty('--main-background', DEFAULT_SETTINGS.mainBackground);
      document.documentElement.style.setProperty('--main-background-image', 'none');
      document.documentElement.style.setProperty('--modal-background', DEFAULT_SETTINGS.modalBackground);
      document.documentElement.style.setProperty('--modal-background-image', 'none');
      document.documentElement.style.setProperty('--sidebar-button-background', DEFAULT_SETTINGS.sidebarButtonBackground);
      document.documentElement.style.setProperty('--sidebar-button-background-opacity', DEFAULT_SETTINGS.sidebarButtonBackgroundImageOpacity);
      document.documentElement.style.setProperty('--sidebar-text-color', DEFAULT_SETTINGS.sidebarTextColor);
      document.documentElement.style.setProperty('--sidebar-text-size', DEFAULT_SETTINGS.sidebarTextSize);
      document.documentElement.style.setProperty('--sidebar-font-family', DEFAULT_SETTINGS.sidebarFontFamily);
      
      setHasChanges(false);
      
      // Уведомление и перезагрузка страницы для полного обновления
      alert('✅ Настройки сброшены к дефолтным значениям!\n\nСтраница будет перезагружена.');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Ошибка сброса настроек:', error);
      alert('❌ Ошибка при сбросе настроек');
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200003,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: settings.modalBackground,
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1400px',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(75, 85, 99, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(75, 85, 99, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FiMonitor size={24} color="#60a5fa" />
            <h2 style={{ margin: 0, fontSize: '1.5em', fontWeight: 700, color: '#60a5fa' }}>
              Настройки фронтенда
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '1.8rem',
              padding: '4px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Контент */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', gap: '24px' }}>
          {/* Левая колонка - настройки */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Основной фон */}
            <Section title="Основной фон" icon={<FiImage size={18} />}>
              <SettingRow label="Цвет фона">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.mainBackground}
                    onChange={(e) => handleChange('mainBackground', e.target.value)}
                    style={{
                      width: '60px',
                      height: '36px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={settings.mainBackground}
                    onChange={(e) => handleChange('mainBackground', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Изображение фона">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                    id="bg-image-upload"
                  />
                  <label
                    htmlFor="bg-image-upload"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    📁 Выбрать изображение
                  </label>
                  {settings.mainBackgroundImage && (
                    <button
                      onClick={() => handleChange('mainBackgroundImage', '')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🗑️ Удалить изображение
                    </button>
                  )}
                </div>
              </SettingRow>

              {settings.mainBackgroundImage && (
                <SettingRow label="Прозрачность изображения">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.mainBackgroundImageOpacity}
                      onChange={(e) => handleChange('mainBackgroundImageOpacity', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#9ca3af', fontSize: '14px', minWidth: '40px' }}>
                      {Math.round(settings.mainBackgroundImageOpacity * 100)}%
                    </span>
                  </div>
                </SettingRow>
              )}
            </Section>

            {/* Фон модалок */}
            <Section title="Фон модальных окон" icon={<FiMonitor size={18} />}>
              <SettingRow label="Цвет фона модалок">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.modalBackground}
                    onChange={(e) => handleChange('modalBackground', e.target.value)}
                    style={{
                      width: '60px',
                      height: '36px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={settings.modalBackground}
                    onChange={(e) => handleChange('modalBackground', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Изображение фона">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        alert('Пожалуйста, выберите изображение');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert('Размер файла не должен превышать 5 МБ');
                        return;
                      }
                      try {
                        const base64 = await loadImageAsBase64(file);
                        handleChange('modalBackgroundImage', base64);
                      } catch (error) {
                        console.error('Ошибка загрузки изображения:', error);
                        alert('Ошибка загрузки изображения');
                      }
                    }}
                    style={{ display: 'none' }}
                    id="modal-bg-image-upload"
                  />
                  <label
                    htmlFor="modal-bg-image-upload"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    📁 Выбрать изображение
                  </label>
                  {settings.modalBackgroundImage && (
                    <button
                      onClick={() => handleChange('modalBackgroundImage', '')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🗑️ Удалить изображение
                    </button>
                  )}
                </div>
              </SettingRow>

              {settings.modalBackgroundImage && (
                <SettingRow label="Прозрачность изображения">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.modalBackgroundImageOpacity}
                      onChange={(e) => handleChange('modalBackgroundImageOpacity', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#9ca3af', fontSize: '14px', minWidth: '40px' }}>
                      {Math.round(settings.modalBackgroundImageOpacity * 100)}%
                    </span>
                  </div>
                </SettingRow>
              )}
            </Section>

            {/* Стили сайдбара */}
            <Section title="Стили сайдбара" icon={<FiType size={18} />}>
              <SettingRow label="Цвет фона кнопок">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.sidebarButtonBackground}
                    onChange={(e) => handleChange('sidebarButtonBackground', e.target.value)}
                    style={{
                      width: '60px',
                      height: '36px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={settings.sidebarButtonBackground}
                    onChange={(e) => handleChange('sidebarButtonBackground', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Изображение фона кнопок">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (!file.type.startsWith('image/')) {
                        alert('Пожалуйста, выберите изображение');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        alert('Размер файла не должен превышать 5 МБ');
                        return;
                      }
                      try {
                        const base64 = await loadImageAsBase64(file);
                        handleChange('sidebarButtonBackgroundImage', base64);
                      } catch (error) {
                        console.error('Ошибка загрузки изображения:', error);
                        alert('Ошибка загрузки изображения');
                      }
                    }}
                    style={{ display: 'none' }}
                    id="sidebar-button-bg-image-upload"
                  />
                  <label
                    htmlFor="sidebar-button-bg-image-upload"
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(59, 130, 246, 0.5)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#60a5fa',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600
                    }}
                  >
                    📁 Выбрать изображение
                  </label>
                  {settings.sidebarButtonBackgroundImage && (
                    <button
                      onClick={() => handleChange('sidebarButtonBackgroundImage', '')}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      🗑️ Удалить изображение
                    </button>
                  )}
                </div>
              </SettingRow>

              {settings.sidebarButtonBackgroundImage && (
                <SettingRow label="Прозрачность изображения кнопок">
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.sidebarButtonBackgroundImageOpacity}
                      onChange={(e) => handleChange('sidebarButtonBackgroundImageOpacity', parseFloat(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ color: '#9ca3af', fontSize: '14px', minWidth: '40px' }}>
                      {Math.round(settings.sidebarButtonBackgroundImageOpacity * 100)}%
                    </span>
                  </div>
                </SettingRow>
              )}


              <SettingRow label="Цвет текста">
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={settings.sidebarTextColor}
                    onChange={(e) => handleChange('sidebarTextColor', e.target.value)}
                    style={{
                      width: '60px',
                      height: '36px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  />
                  <input
                    type="text"
                    value={settings.sidebarTextColor}
                    onChange={(e) => handleChange('sidebarTextColor', e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Размер текста">
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="10"
                    max="20"
                    step="1"
                    value={parseInt(settings.sidebarTextSize)}
                    onChange={(e) => handleChange('sidebarTextSize', e.target.value + 'px')}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={settings.sidebarTextSize}
                    onChange={(e) => handleChange('sidebarTextSize', e.target.value)}
                    style={{
                      width: '60px',
                      padding: '8px',
                      borderRadius: '6px',
                      border: '1px solid rgba(75, 85, 99, 0.5)',
                      background: '#111827',
                      color: '#fff',
                      fontSize: '14px',
                      textAlign: 'center'
                    }}
                  />
                </div>
              </SettingRow>

              <SettingRow label="Шрифт">
                <select
                  value={settings.sidebarFontFamily}
                  onChange={(e) => handleChange('sidebarFontFamily', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(75, 85, 99, 0.5)',
                    background: '#111827',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                >
                  <option value="Inter, system-ui, -apple-system, sans-serif">Inter (по умолчанию)</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                  <option value="'Segoe UI', Tahoma, Geneva, Verdana, sans-serif">Segoe UI</option>
                  <option value="'Roboto', sans-serif">Roboto</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
                  <option value="'Lato', sans-serif">Lato</option>
                  <option value="Georgia, serif">Georgia</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman</option>
                  <option value="'Courier New', Courier, monospace">Courier New</option>
                </select>
              </SettingRow>
            </Section>
          </div>

          {/* Правая колонка - превью */}
          <div
            style={{
              width: '380px',
              background: settings.mainBackground,
              backgroundImage: settings.mainBackgroundImage ? `url(${settings.mainBackgroundImage})` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '12px',
              border: '2px solid rgba(59, 130, 246, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Overlay для прозрачности изображения */}
            {settings.mainBackgroundImage && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: settings.mainBackground,
                  opacity: 1 - settings.mainBackgroundImageOpacity
                }}
              />
            )}

            {/* Превью сайдбара */}
            <div style={{ position: 'relative', zIndex: 1, padding: '16px' }}>
              <div
                style={{
                  background: settings.modalBackground,
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: 700, 
                  color: '#60a5fa',
                  marginBottom: '12px'
                }}>
                  Превью сайдбара
                </div>
                
                {/* Примеры кнопок */}
                {['Чаты', 'Задачи', 'Новости', 'Календарь', 'Отпуска'].map((text, i) => (
                  <div
                    key={i}
                    style={{
                      background: settings.sidebarButtonBackground,
                      backgroundImage: settings.sidebarButtonBackgroundImage ? `url(${settings.sidebarButtonBackgroundImage})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      color: settings.sidebarTextColor,
                      fontSize: settings.sidebarTextSize,
                      fontFamily: settings.sidebarFontFamily,
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Overlay для прозрачности изображения кнопки */}
                    {settings.sidebarButtonBackgroundImage && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          background: settings.sidebarButtonBackground,
                          opacity: 1 - settings.sidebarButtonBackgroundImageOpacity,
                          pointerEvents: 'none'
                        }}
                      />
                    )}
                    <div style={{ 
                      width: '8px', 
                      height: '8px', 
                      borderRadius: '50%', 
                      background: settings.sidebarTextColor,
                      opacity: 0.5,
                      position: 'relative',
                      zIndex: 1
                    }} />
                    <span style={{ position: 'relative', zIndex: 1 }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* Превью модалки */}
              <div
                style={{
                  background: settings.modalBackground,
                  backgroundImage: settings.modalBackgroundImage ? `url(${settings.modalBackgroundImage})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Overlay для прозрачности изображения модалки */}
                {settings.modalBackgroundImage && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: settings.modalBackground,
                      opacity: 1 - settings.modalBackgroundImageOpacity,
                      pointerEvents: 'none'
                    }}
                  />
                )}
                
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    color: '#9ca3af',
                    marginBottom: '8px'
                  }}>
                    Превью модального окна
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6b7280',
                    lineHeight: 1.6
                  }}>
                    Здесь отображается, как будут выглядеть модальные окна с выбранным фоном.
                  </div>
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '8px 12px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: '#60a5fa',
                      fontSize: '12px',
                      textAlign: 'center'
                    }}
                  >
                    Пример кнопки
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Футер с кнопками */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '16px 24px',
            borderTop: '1px solid rgba(75, 85, 99, 0.3)'
          }}
        >
          <button
            onClick={handleReset}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.2)';
              e.target.style.borderColor = 'rgba(239, 68, 68, 0.7)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(239, 68, 68, 0.1)';
              e.target.style.borderColor = 'rgba(239, 68, 68, 0.5)';
            }}
          >
            ⚠️ Сбросить к дефолту
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: '1px solid rgba(75, 85, 99, 0.5)',
                background: 'transparent',
                color: '#9ca3af',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: hasChanges ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid rgba(75, 85, 99, 0.5)',
                background: hasChanges ? 'rgba(34, 197, 94, 0.2)' : 'rgba(75, 85, 99, 0.1)',
                color: hasChanges ? '#4ade80' : '#6b7280',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                fontWeight: 700,
                fontSize: '14px'
              }}
            >
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Вспомогательные компоненты
function Section({ title, icon, children }) {
  return (
    <div
      style={{
        background: 'rgba(31, 41, 55, 0.5)',
        border: '1px solid rgba(75, 85, 99, 0.3)',
        borderRadius: '12px',
        padding: '16px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: '#60a5fa' }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e5e7eb' }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', marginBottom: '6px' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

