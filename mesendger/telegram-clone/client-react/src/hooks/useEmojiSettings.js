import { useState, useEffect } from 'react';

const DEFAULT_SETTINGS = {
  customEmojiSize: 64, // Увеличен с 56 до 64 для лучшей видимости
  standardEmojiSize: 1.6,
  customEmojiInPicker: 64,
  standardEmojiInPicker: 32,
  customEmojiInModal: 48,
  standardEmojiInModal: 1.2,
  showStandardEmojis: true,
  // Добавляем настройку для одиночных эмодзи
  emojiOnlySize: 64,
  // Новые области использования кастомных эмодзи
  customEmojiInNews: 48,
  customEmojiInNewsComments: 48,
  customEmojiInCongrats: 48,
  customEmojiInCongratsComments: 48,
  customEmojiInChatModal: 48
};

export function useEmojiSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    // Загружаем сохраненные настройки из localStorage
    const savedSettings = localStorage.getItem('emojiSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // ИСПРАВЛЕНИЕ: Принудительно устанавливаем минимальные размеры
        const correctedSettings = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          // Гарантируем минимальные размеры для хорошей видимости
          customEmojiSize: Math.max(parsed.customEmojiSize || 64, 64),
          emojiOnlySize: Math.max(parsed.emojiOnlySize || 64, 64)
        };
        setSettings(correctedSettings);
        
        // Если настройки были исправлены, сохраняем их обратно
        if (correctedSettings.customEmojiSize !== parsed.customEmojiSize || 
            correctedSettings.emojiOnlySize !== parsed.emojiOnlySize) {
          localStorage.setItem('emojiSettings', JSON.stringify(correctedSettings));
        }
      } catch (error) {
        console.error('Error loading emoji settings:', error);
      }
    }

    // Слушаем события обновления настроек
    const handleSettingsUpdate = (event) => {
      setSettings(event.detail);
    };

    window.addEventListener('emojiSettingsUpdated', handleSettingsUpdate);
    
    // Добавляем глобальную функцию для принудительного исправления размеров
    window.fixEmojiSizes = () => {
      const currentSettings = JSON.parse(localStorage.getItem('emojiSettings') || '{}');
      const fixedSettings = {
        ...DEFAULT_SETTINGS,
        ...currentSettings,
        customEmojiSize: Math.max(currentSettings.customEmojiSize || 64, 64),
        emojiOnlySize: 208 // Принудительно устанавливаем крупный размер
      };
      
      localStorage.setItem('emojiSettings', JSON.stringify(fixedSettings));
      window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: fixedSettings }));
      
      console.log('✅ Размеры эмодзи исправлены:', fixedSettings);
      alert('Размеры эмодзи исправлены! Перезагрузите страницу для применения изменений.');
    };
    
    // Добавляем обработчик принудительных настроек от сервера
    if (window.socket) {
      window.socket.on('force_emoji_settings', (serverSettings) => {
        console.log('🔧 Получены принудительные настройки эмодзи от сервера:', serverSettings);
        const updatedSettings = { ...settings, ...serverSettings };
        localStorage.setItem('emojiSettings', JSON.stringify(updatedSettings));
        setSettings(updatedSettings);
        window.dispatchEvent(new CustomEvent('emojiSettingsUpdated', { detail: updatedSettings }));
      });
    }
    
    return () => {
      window.removeEventListener('emojiSettingsUpdated', handleSettingsUpdate);
      delete window.fixEmojiSizes;
    };
  }, []);

  return settings;
}
