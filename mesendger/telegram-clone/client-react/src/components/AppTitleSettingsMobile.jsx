import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FaArrowLeft } from 'react-icons/fa';
import { FiX, FiType, FiSave, FiRotateCcw } from 'react-icons/fi';
import frostyImg from '../assets/icons/Frosty.png';
import api from 'services/api';

const DEFAULT_SETTINGS = {
  text: 'Issa Plus',
  fontSize: '2em',
  fontFamily: 'Arial, sans-serif',
  fontWeight: 'normal',
  fontStyle: 'normal',
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
  snowmanImage: null, // Для обратной совместимости
  snowmanPositionX: 0, // Для обратной совместимости
  snowmanPositionY: 0, // Для обратной совместимости
  snowmanScale: 100, // Для обратной совместимости
  snowmanPositionType: 'relative', // Для обратной совместимости
  snowmanImages: [], // Массив объектов с изображениями: [{id, image, positionX, positionY, scale, positionType, enabled, selected}]
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
      const settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      // Исправление: если avatarImage указывает на изображение снеговика, сбрасываем его
      if (settings.avatarImage && (settings.avatarImage.includes('Frosty.png') || settings.avatarImage.includes('snowman') || settings.avatarImage === settings.snowmanImage)) {
        settings.avatarImage = null;
      }
      
      // Валидация и очистка массива snowmanImages
      if (settings.snowmanImages && Array.isArray(settings.snowmanImages)) {
        const seenIds = new Set();
        const seenImages = new Set();
        const validImages = [];
        
        settings.snowmanImages.forEach((img, index) => {
          // Проверяем, что объект существует и имеет необходимые поля
          if (!img || typeof img !== 'object') return;
          
          // Генерируем уникальный ID, если он отсутствует или дублируется
          let imageId = img.id;
          if (!imageId || seenIds.has(imageId)) {
            imageId = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
          }
          seenIds.add(imageId);
          
          // Проверяем, что изображение уникально (не дублируется)
          const imageData = img.image;
          if (!imageData || seenImages.has(imageData)) {
            return; // Пропускаем дубликаты
          }
          seenImages.add(imageData);
          
          // Создаем валидный объект изображения
          validImages.push({
            id: imageId,
            image: imageData,
            positionX: typeof img.positionX === 'number' ? img.positionX : 0,
            positionY: typeof img.positionY === 'number' ? img.positionY : 0,
            scale: typeof img.scale === 'number' ? img.scale : 100,
            positionType: img.positionType === 'absolute' ? 'absolute' : 'relative',
            enabled: img.enabled !== false,
            selected: img.selected === true
          });
        });
        
        // Убеждаемся, что только одно изображение выбрано
        const selectedCount = validImages.filter(img => img.selected).length;
        if (selectedCount > 1) {
          // Если выбрано несколько, оставляем только первое
          let firstSelected = true;
          validImages.forEach(img => {
            if (img.selected && !firstSelected) {
              img.selected = false;
            }
            if (img.selected) {
              firstSelected = false;
            }
          });
        } else if (selectedCount === 0 && validImages.length > 0) {
          // Если ни одно не выбрано, выбираем первое
          validImages[0].selected = true;
        }
        
        settings.snowmanImages = validImages;
      } else if (!Array.isArray(settings.snowmanImages)) {
        // Если snowmanImages не массив, создаем пустой массив
        settings.snowmanImages = [];
      }
      
      return settings;
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
        snowmanImage: null,
        snowmanImages: []
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
      snowmanImage: null,
      snowmanImages: []
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
  const modalRef = useRef(null);
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [showPresetInput, setShowPresetInput] = useState(false);
  
  // Для drag and drop
  const [dragging, setDragging] = useState(null); // 'avatar' или 'snowman' или 'snowman-image-{id}'
  const [draggingImageId, setDraggingImageId] = useState(null); // ID активного изображения при перетаскивании
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const previewContainerRef = useRef(null);
  
  // Получаем активное изображение (выбранное для манипуляций)
  const getActiveSnowmanImage = () => {
    const images = settings.snowmanImages || [];
    return images.find(img => img.selected === true) || images[0] || null;
  };
  
  // Получаем индекс активного изображения
  const getActiveSnowmanImageIndex = () => {
    const images = settings.snowmanImages || [];
    return images.findIndex(img => img.selected === true);
  };

  useEffect(() => {
    if (open) {
      // Загружаем настройки из localStorage - они должны содержать сохраненные изображения
      const saved = getAppTitleSettings();
      // Убеждаемся, что snowmanImages - это массив
      if (saved.snowmanImages && !Array.isArray(saved.snowmanImages)) {
        saved.snowmanImages = [];
      } else if (!saved.snowmanImages) {
        saved.snowmanImages = [];
      }
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
    
    // Обработка customFontUrl - извлекаем URL из HTML если вставлен код
    if (key === 'customFontUrl' && value) {
      // Проверяем, содержит ли значение HTML теги
      if (value.includes('<link') || value.includes('href=')) {
        // Извлекаем URL из href атрибута
        const hrefMatch = value.match(/href=["']([^"']+)["']/);
        if (hrefMatch && hrefMatch[1]) {
          processedValue = hrefMatch[1];
        }
        
        // Пытаемся извлечь название шрифта из family параметра
        const familyMatch = value.match(/family=([^&:"'<>]+)/);
        if (familyMatch && familyMatch[1]) {
          // Декодируем URL и очищаем название
          const fontName = decodeURIComponent(familyMatch[1]).replace(/\+/g, ' ').split(':')[0];
          // Обновляем также название шрифта
          setTimeout(() => {
            setSettings(prev => ({ ...prev, customFontName: fontName }));
          }, 0);
        }
      }
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
    if (!file) return;
    
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Файл слишком большой. Максимальный размер: 5MB. Файл будет сжат после загрузки.');
    }
    
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const compressed = await compressImage(reader.result, 300, 300, 0.75);
        // Генерируем уникальный ID с временной меткой и случайным числом
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newImage = {
          id: uniqueId,
          image: compressed,
          positionX: 0,
          positionY: 0,
          scale: 100,
          positionType: 'relative',
          enabled: true,
          selected: false
        };
        
        const images = settings.snowmanImages || [];
        // Если это первое изображение, делаем его выбранным
        if (images.length === 0) {
          newImage.selected = true;
        }
        
        // Для обратной совместимости: если есть старое snowmanImage, добавляем его в массив
        let updatedImages = [...images, newImage];
        if (!images.length && settings.snowmanImage) {
          updatedImages = [{
            id: `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            image: settings.snowmanImage,
            positionX: settings.snowmanPositionX || 0,
            positionY: settings.snowmanPositionY || 0,
            scale: settings.snowmanScale || 100,
            positionType: settings.snowmanPositionType || 'relative',
            enabled: true,
            selected: false
          }, newImage];
          newImage.selected = true;
        }
        
        setSettings({ ...settings, snowmanImages: updatedImages });
        setHasChanges(true);
      } catch (error) {
        console.error('Ошибка при сжатии изображения снеговика:', error);
        alert('Ошибка при обработке изображения. Попробуйте другое изображение.');
      }
    };
    reader.readAsDataURL(file);
    // Сброс input для возможности повторной загрузки того же файла
    event.target.value = '';
  };

  // Обработка загрузки файла шрифта
  const handleFontFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Проверяем формат файла
      const validExtensions = ['.ttf', '.woff', '.woff2', '.otf'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!validExtensions.includes(fileExtension)) {
        alert('Неподдерживаемый формат файла. Поддерживаются: TTF, WOFF, WOFF2, OTF');
        return;
      }
      
      // Проверяем размер файла (максимум 2MB для шрифтов)
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (file.size > maxSize) {
        alert('Файл шрифта слишком большой. Максимальный размер: 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          // Получаем base64 данные шрифта
          const fontData = reader.result;
          
          // Определяем формат для @font-face
          let fontFormat = 'truetype';
          if (fileExtension === '.woff') fontFormat = 'woff';
          if (fileExtension === '.woff2') fontFormat = 'woff2';
          if (fileExtension === '.otf') fontFormat = 'opentype';
          
          // Получаем название шрифта из имени файла
          const fontName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          
          // Создаем @font-face правило
          const fontFaceRule = `
            @font-face {
              font-family: '${fontName}';
              src: url('${fontData}') format('${fontFormat}');
              font-weight: normal;
              font-style: normal;
            }
          `;
          
          // Добавляем стиль в документ
          let styleElement = document.getElementById('custom-uploaded-font-mobile');
          if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'custom-uploaded-font-mobile';
            document.head.appendChild(styleElement);
          }
          styleElement.textContent = fontFaceRule;
          
          // Сохраняем данные шрифта и имя
          const newSettings = {
            ...settings,
            customFontUrl: fontData, // Сохраняем base64 данные
            customFontName: fontName,
            fontFamily: `'${fontName}', sans-serif`
          };
          setSettings(newSettings);
          setHasChanges(true);
          
          alert(`Шрифт "${fontName}" успешно загружен!`);
        } catch (error) {
          console.error('Ошибка при загрузке шрифта:', error);
          alert('Ошибка при обработке файла шрифта. Попробуйте другой файл.');
        }
      };
      reader.readAsDataURL(file);
    }
    // Сброс input для возможности повторной загрузки того же файла
    event.target.value = '';
  };
  
  // Удаление изображения
  const handleRemoveSnowmanImage = (imageId) => {
    const images = settings.snowmanImages || [];
    const filtered = images.filter(img => img.id !== imageId);
    
    // Если удаляем выбранное изображение, выбираем первое из оставшихся
    if (filtered.length > 0 && images.find(img => img.id === imageId)?.selected) {
      filtered[0].selected = true;
    }
    
    setSettings({ ...settings, snowmanImages: filtered });
    setHasChanges(true);
  };
  
  // Выбор активного изображения
  const handleSelectSnowmanImage = (imageId) => {
    const images = settings.snowmanImages || [];
    const updated = images.map(img => ({
      ...img,
      selected: img.id === imageId
    }));
    setSettings({ ...settings, snowmanImages: updated });
    setHasChanges(true);
  };
  
  // Обновление параметров активного изображения
  const updateActiveSnowmanImage = (updates) => {
    const images = settings.snowmanImages || [];
    const activeIndex = images.findIndex(img => img.selected === true);
    if (activeIndex === -1) return;
    
    const updated = [...images];
    updated[activeIndex] = { ...updated[activeIndex], ...updates };
    setSettings({ ...settings, snowmanImages: updated });
    setHasChanges(true);
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      alert('Введите название пресета');
      return;
    }

    // Сохраняем все настройки, включая изображения и их позиции
    const presetSettings = {
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
      effectType: settings.effectType,
      // Сохраняем настройки изображений
      snowmanEnabled: settings.snowmanEnabled,
      snowmanImages: settings.snowmanImages ? JSON.parse(JSON.stringify(settings.snowmanImages)) : [], // Глубокая копия массива
      snowmanImage: settings.snowmanImage, // Для обратной совместимости
      snowmanPositionX: settings.snowmanPositionX,
      snowmanPositionY: settings.snowmanPositionY,
      snowmanScale: settings.snowmanScale,
      snowmanPositionType: settings.snowmanPositionType,
      avatarImage: settings.avatarImage,
      avatarPositionX: settings.avatarPositionX,
      avatarPositionY: settings.avatarPositionY,
      avatarWidth: settings.avatarWidth,
      avatarHeight: settings.avatarHeight
    };

    const preset = {
      id: Date.now().toString(),
      name: presetName.trim(),
      settings: presetSettings,
      createdAt: new Date().toISOString()
    };

    if (savePreset(preset)) {
      setPresets(getPresets());
      setPresetName('');
      setShowPresetInput(false);
      alert(`Пресет "${preset.name}" сохранен со всеми настройками и изображениями!`);
    } else {
      alert('Ошибка при сохранении пресета');
    }
  };

  const handleApplyPreset = (preset) => {
    // Применяем все настройки из пресета, включая изображения
    const newSettings = {
      ...settings,
      ...preset.settings
    };
    // Убеждаемся, что snowmanImages - это массив
    if (newSettings.snowmanImages && !Array.isArray(newSettings.snowmanImages)) {
      newSettings.snowmanImages = [];
    } else if (!newSettings.snowmanImages) {
      newSettings.snowmanImages = [];
    }
    // Убеждаемся, что хотя бы одно изображение выбрано, если есть изображения
    if (newSettings.snowmanImages.length > 0) {
      const hasSelected = newSettings.snowmanImages.some(img => img.selected === true);
      if (!hasSelected) {
        newSettings.snowmanImages[0].selected = true;
      }
    }
    setSettings(newSettings);
    setHasChanges(true);
    alert(`Пресет "${preset.name}" применен со всеми настройками и изображениями!`);
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
      
      // Сжимаем изображения в массиве snowmanImages и валидируем их
      if (settingsToSave.snowmanImages && Array.isArray(settingsToSave.snowmanImages)) {
        try {
          const seenIds = new Set();
          const seenImages = new Set();
          const validImages = [];
          
          settingsToSave.snowmanImages = await Promise.all(
            settingsToSave.snowmanImages.map(async (img, index) => {
              // Пропускаем невалидные объекты
              if (!img || typeof img !== 'object') return null;
              
              // Генерируем уникальный ID, если он отсутствует или дублируется
              let imageId = img.id;
              if (!imageId || seenIds.has(imageId)) {
                imageId = `img-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
              }
              seenIds.add(imageId);
              
              // Сжимаем изображение, если это base64
              let imageData = img.image;
              if (imageData && imageData.startsWith('data:image')) {
                try {
                  imageData = await compressImage(imageData, 300, 300, 0.75);
                } catch (error) {
                  console.error('Ошибка при сжатии изображения снеговика:', error);
                  // Продолжаем с исходным изображением
                }
              }
              
              // Проверяем, что изображение уникально (не дублируется)
              if (!imageData || seenImages.has(imageData)) {
                return null; // Пропускаем дубликаты
              }
              seenImages.add(imageData);
              
              // Возвращаем валидный объект изображения
              return {
                id: imageId,
                image: imageData,
                positionX: typeof img.positionX === 'number' ? img.positionX : 0,
                positionY: typeof img.positionY === 'number' ? img.positionY : 0,
                scale: typeof img.scale === 'number' ? img.scale : 100,
                positionType: img.positionType === 'absolute' ? 'absolute' : 'relative',
                enabled: img.enabled !== false,
                selected: img.selected === true
              };
            })
          );
          
          // Удаляем null значения (невалидные объекты)
          settingsToSave.snowmanImages = settingsToSave.snowmanImages.filter(img => img !== null);
          
          // Убеждаемся, что только одно изображение выбрано
          const selectedCount = settingsToSave.snowmanImages.filter(img => img.selected).length;
          if (selectedCount > 1) {
            // Если выбрано несколько, оставляем только первое
            let firstSelected = true;
            settingsToSave.snowmanImages.forEach(img => {
              if (img.selected && !firstSelected) {
                img.selected = false;
              }
              if (img.selected) {
                firstSelected = false;
              }
            });
          } else if (selectedCount === 0 && settingsToSave.snowmanImages.length > 0) {
            // Если ни одно не выбрано, выбираем первое
            settingsToSave.snowmanImages[0].selected = true;
          }
        } catch (error) {
          console.error('Ошибка при сжатии изображений снеговика:', error);
        }
      } else if (!Array.isArray(settingsToSave.snowmanImages)) {
        // Если snowmanImages не массив, создаем пустой массив
        settingsToSave.snowmanImages = [];
      }
      
      // Обратная совместимость: сжимаем старое одиночное изображение
      if (settingsToSave.snowmanImage && settingsToSave.snowmanImage.startsWith('data:image')) {
        try {
          settingsToSave.snowmanImage = await compressImage(settingsToSave.snowmanImage, 300, 300, 0.75);
        } catch (error) {
          console.error('Ошибка при сжатии снеговика:', error);
        }
      }
      
      // Сохраняем в localStorage для локального использования
      setAppTitleSettings(settingsToSave);
      // Обновляем состояние, чтобы изображения оставались в превью
      setSettings(settingsToSave);
      setHasChanges(false);
      
      // Сохраняем на сервере для синхронизации между всеми пользователями
      try {
        const response = await api.post('/api/sidebar-settings', { settings: settingsToSave });
        if (response.data.success) {
          alert('Настройки названия приложения сохранены и синхронизированы со всеми пользователями!');
        } else {
          alert('Настройки сохранены локально, но не удалось синхронизировать с сервером.');
        }
      } catch (error) {
        console.error('Ошибка синхронизации настроек с сервером:', error);
        // Показываем предупреждение, но не блокируем сохранение
        if (error.response?.status === 403) {
          alert('Настройки сохранены локально. Для синхронизации с другими пользователями необходимы права администратора.');
        } else {
          alert('Настройки сохранены локально, но не удалось синхронизировать с сервером. Проверьте подключение к интернету.');
        }
      }
      
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

  // Свайп отключен в этой модалке

  const handleClose = useCallback(() => {
    // Закрываем модалку, возвращаемся в AdminMobile (не в SidebarNav)
    onClose();
  }, [onClose]);

  // Обработчики для drag and drop
  const handleDragStart = useCallback((e, type, imageId = null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(type);
    setDraggingImageId(imageId);
    const rect = previewContainerRef.current?.getBoundingClientRect();
    if (rect) {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      setDragStart({ x: clientX - rect.left, y: clientY - rect.top });
      
      if (type === 'avatar') {
        setDragOffset({
          x: settings.avatarPositionX || 0,
          y: settings.avatarPositionY || 0
        });
      } else if (type.startsWith('snowman-image-')) {
        const img = settings.snowmanImages?.find(i => i.id === imageId);
        if (img) {
          setDragOffset({
            x: img.positionX || 0,
            y: img.positionY || 0
          });
        }
      } else if (type === 'snowman') {
        // Обратная совместимость со старым форматом
        setDragOffset({
          x: settings.snowmanPositionX || 0,
          y: settings.snowmanPositionY || 0
        });
      }
    }
  }, [settings]);

  const handleDragMove = useCallback((e) => {
    if (!dragging || !previewContainerRef.current) return;
    
    e.preventDefault();
    e.stopPropagation();
    const rect = previewContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const newX = clientX - rect.left - dragStart.x + dragOffset.x;
    const newY = clientY - rect.top - dragStart.y + dragOffset.y;
    
    if (dragging === 'avatar') {
      const clampedX = Math.max(-100, Math.min(100, newX));
      const clampedY = Math.max(-100, Math.min(100, newY));
      handleChange('avatarPositionX', Math.round(clampedX));
      handleChange('avatarPositionY', Math.round(clampedY));
    } else if (dragging.startsWith('snowman-image-')) {
      const clampedX = Math.max(-800, Math.min(800, newX));
      const clampedY = Math.max(-800, Math.min(800, newY));
      updateActiveSnowmanImage({
        positionX: Math.round(clampedX),
        positionY: Math.round(clampedY)
      });
    } else if (dragging === 'snowman') {
      // Обратная совместимость со старым форматом
      const clampedX = Math.max(-800, Math.min(800, newX));
      const clampedY = Math.max(-800, Math.min(800, newY));
      handleChange('snowmanPositionX', Math.round(clampedX));
      handleChange('snowmanPositionY', Math.round(clampedY));
    }
  }, [dragging, dragStart, dragOffset, handleChange, updateActiveSnowmanImage]);

  const handleDragEnd = useCallback(() => {
    setDragging(null);
    setDraggingImageId(null);
    setDragStart({ x: 0, y: 0 });
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Добавляем глобальные обработчики для мыши и тач-событий
  useEffect(() => {
    if (!dragging) return;
    
    const handleMouseMove = (e) => handleDragMove(e);
    const handleMouseUp = () => handleDragEnd();
    const handleTouchMove = (e) => handleDragMove(e);
    const handleTouchEnd = () => handleDragEnd();
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragging, handleDragMove, handleDragEnd]);

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
                  Вставьте код Google Fonts или прямой URL:<br/>
                  <code style={{ background: '#0e1014', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', display: 'inline-block', marginTop: '4px' }}>
                    &lt;link href="..." rel="stylesheet"&gt;
                  </code>
                </div>
                <input
                  type="text"
                  value={settings.customFontUrl || ''}
                  onChange={(e) => handleChange('customFontUrl', e.target.value)}
                  onPaste={(e) => {
                    // Даем React обработать вставку через handleChange
                    setTimeout(() => {
                      const pastedText = e.target.value;
                      if (pastedText.includes('<link') || pastedText.includes('href=')) {
                        handleChange('customFontUrl', pastedText);
                      }
                    }, 10);
                  }}
                  placeholder="Вставьте код <link> или URL"
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
                  placeholder="Название шрифта (например: Roboto)"
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
                />
                
                {/* Разделитель ИЛИ */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  margin: '16px 0',
                  gap: '12px'
                }}>
                  <div style={{ flex: 1, height: '1px', background: '#444' }}></div>
                  <span style={{ color: '#999', fontSize: '12px', fontWeight: 600 }}>ИЛИ</span>
                  <div style={{ flex: 1, height: '1px', background: '#444' }}></div>
                </div>
                
                {/* Загрузка файла шрифта */}
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#e0e0e0', fontSize: '13px' }}>
                  Загрузить файл шрифта
                </label>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Форматы: TTF, WOFF, WOFF2, OTF (макс. 2MB)
                </div>
                <input
                  type="file"
                  accept=".ttf,.woff,.woff2,.otf"
                  onChange={handleFontFileUpload}
                  style={{ display: 'none' }}
                  id="font-file-upload-mobile"
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('font-file-upload-mobile').click()}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px dashed #444',
                    background: '#1a1d24',
                    color: '#a3e635',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxSizing: 'border-box',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Выбрать файл шрифта
                </button>
                
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  После загрузки файла шрифт автоматически применится
                </div>
              </div>
              
              {/* Font Weight */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#e0e0e0', fontSize: '13px' }}>
                  Насыщенность шрифта
                </label>
                <select
                  value={settings.fontWeight || 'normal'}
                  onChange={(e) => handleChange('fontWeight', e.target.value)}
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
                  <option value="100">Тонкий (100)</option>
                  <option value="200">Очень лёгкий (200)</option>
                  <option value="300">Лёгкий (300)</option>
                  <option value="normal">Обычный (400)</option>
                  <option value="500">Средний (500)</option>
                  <option value="600">Полужирный (600)</option>
                  <option value="bold">Жирный (700)</option>
                  <option value="800">Очень жирный (800)</option>
                  <option value="900">Сверхжирный (900)</option>
                </select>
              </div>
              
              {/* Font Style */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#e0e0e0', fontSize: '13px' }}>
                  Стиль шрифта
                </label>
                <select
                  value={settings.fontStyle || 'normal'}
                  onChange={(e) => handleChange('fontStyle', e.target.value)}
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
                  <option value="normal">Обычный</option>
                  <option value="italic">Курсив (Italic)</option>
                  <option value="oblique">Наклонный (Oblique)</option>
                </select>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Если шрифт отображается по-разному на ПК и телефоне - измените на "Обычный"
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
                    Сохранит текущие настройки: текст, цвет, градиент, свечение, эффекты, шрифт, а также все изображения (елка, снеговик) с их позициями и размерами
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
                Показать изображения
              </label>
              {settings.snowmanEnabled && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginLeft: '26px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                      Загрузить изображение
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
                    <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                      Вы можете загрузить несколько изображений. Выберите изображение галочкой для настройки позиции и размера.
                    </div>
                  </div>
                  
                  {/* Список загруженных изображений */}
                  {settings.snowmanImages && settings.snowmanImages.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                        Загруженные изображения (выберите для настройки):
                      </label>
                      {settings.snowmanImages.map((img, index) => (
                        <div
                          key={img.id}
                          style={{
                            padding: '12px',
                            borderRadius: '8px',
                            border: `2px solid ${img.selected ? '#43e97b' : '#444'}`,
                            background: img.selected ? 'rgba(67,233,123,0.1)' : '#1a1d24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={img.selected === true}
                            onChange={() => handleSelectSnowmanImage(img.id)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {img.image ? (
                              <img
                                src={img.image}
                                alt={`Изображение ${index + 1}`}
                                style={{
                                  width: '60px',
                                  height: '60px',
                                  objectFit: 'cover',
                                  borderRadius: '8px',
                                  border: '1px solid #444',
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '8px',
                                background: '#2a2f38',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '24px',
                              }}>
                                ⛄
                              </div>
                            )}
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: '#e0e0e0', fontSize: '14px', marginBottom: '4px' }}>
                                Изображение {index + 1}
                              </div>
                              <div style={{ fontSize: '12px', color: '#999' }}>
                                {img.selected ? '✓ Активно для настройки' : 'Нажмите галочку для выбора'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveSnowmanImage(img.id)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: '1px solid #e74c3c',
                              background: 'rgba(231,76,60,0.15)',
                              color: '#e74c3c',
                              cursor: 'pointer',
                              fontWeight: 500,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            Удалить
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Настройки для активного изображения */}
                  {(() => {
                    const activeImage = getActiveSnowmanImage();
                    if (!activeImage) {
                      return (
                        <div style={{ padding: '16px', background: 'rgba(67,233,123,0.1)', borderRadius: '8px', border: '1px solid rgba(67,233,123,0.3)' }}>
                          <div style={{ color: '#43e97b', fontSize: '13px', textAlign: 'center' }}>
                            Выберите изображение галочкой для настройки позиции и размера
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(67,233,123,0.15)', borderRadius: '8px', border: '1px solid rgba(67,233,123,0.3)' }}>
                          <div style={{ color: '#43e97b', fontWeight: 600, fontSize: '13px', marginBottom: '8px' }}>
                            ⚙️ Настройки активного изображения
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            Вы выбрали изображение для настройки. Используйте ползунки ниже или перетащите изображение в превью.
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                            Тип позиционирования
                          </label>
                          <select
                            value={activeImage.positionType || 'relative'}
                            onChange={(e) => updateActiveSnowmanImage({ positionType: e.target.value })}
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
                            {activeImage.positionType === 'relative' ? 'Позиция относительно текста названия' : 'Позиция относительно всего блока сайдбара'}
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                            Позиция по горизонтали: {activeImage.positionX !== undefined ? activeImage.positionX : 0}px
                          </label>
                          <input
                            type="range"
                            min="-800"
                            max="800"
                            step="10"
                            value={activeImage.positionX !== undefined ? activeImage.positionX : 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              updateActiveSnowmanImage({ positionX: value });
                            }}
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                            <span>-800px (влево)</span>
                            <span>0px (центр)</span>
                            <span>800px (вправо)</span>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                            Позиция по вертикали: {activeImage.positionY !== undefined ? activeImage.positionY : 0}px
                          </label>
                          <input
                            type="range"
                            min="-800"
                            max="800"
                            step="10"
                            value={activeImage.positionY !== undefined ? activeImage.positionY : 0}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              updateActiveSnowmanImage({ positionY: value });
                            }}
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                            <span>-800px (вверх)</span>
                            <span>0px (центр)</span>
                            <span>800px (вниз)</span>
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                            Размер: {activeImage.scale !== undefined ? activeImage.scale : 100}%
                          </label>
                          <input
                            type="range"
                            min="25"
                            max="400"
                            step="5"
                            value={activeImage.scale !== undefined ? activeImage.scale : 100}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              updateActiveSnowmanImage({ scale: value });
                            }}
                            style={{ width: '100%' }}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666', marginTop: '4px' }}>
                            <span>25% (очень маленький)</span>
                            <span>100% (норма)</span>
                            <span>400% (очень большой)</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                  
                  {/* Обратная совместимость: если используется старый формат (snowmanImage) */}
                  {(!settings.snowmanImages || settings.snowmanImages.length === 0) && settings.snowmanImage && (
                    <>
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,193,7,0.15)', borderRadius: '8px', border: '1px solid rgba(255,193,7,0.3)' }}>
                        <div style={{ color: '#ffc107', fontSize: '12px', marginBottom: '8px' }}>
                          ⚠️ Используется старый формат. Загрузите новое изображение для использования новой системы управления.
                        </div>
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
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                          Позиция по горизонтали: {settings.snowmanPositionX !== undefined ? settings.snowmanPositionX : 0}px
                        </label>
                        <input
                          type="range"
                          min="-800"
                          max="800"
                          step="10"
                          value={settings.snowmanPositionX !== undefined ? settings.snowmanPositionX : 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            handleChange('snowmanPositionX', value);
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                          Позиция по вертикали: {settings.snowmanPositionY !== undefined ? settings.snowmanPositionY : 0}px
                        </label>
                        <input
                          type="range"
                          min="-800"
                          max="800"
                          step="10"
                          value={settings.snowmanPositionY !== undefined ? settings.snowmanPositionY : 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            handleChange('snowmanPositionY', value);
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, color: '#cbd5e1', fontSize: '13px' }}>
                          Размер: {settings.snowmanScale !== undefined ? settings.snowmanScale : 100}%
                        </label>
                        <input
                          type="range"
                          min="25"
                          max="400"
                          step="5"
                          value={settings.snowmanScale !== undefined ? settings.snowmanScale : 100}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10);
                            handleChange('snowmanScale', value);
                          }}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </>
                  )}
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
              <div style={{ fontSize: '13px', color: '#999', marginBottom: '12px', fontWeight: 600 }}>
                Превью сайдбара (перетащите изображения для изменения позиции, масштаб уменьшен для удобства):
              </div>
              <div 
                ref={previewContainerRef}
                style={{
                  background: 'linear-gradient(135deg, #232931 0%, #181c22 100%)',
                  width: '100%',
                  height: '600px', // Фиксированная высота для предсказуемого масштабирования
                  borderRadius: '8px',
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '16px 20px',
                  boxShadow: '0 2px 12px rgba(44,62,80,0.10)',
                  transform: 'scale(0.85)', // Уменьшенный масштаб для видимости всего сайдбара
                  transformOrigin: 'top center',
                  marginBottom: '-10%', // Компенсация масштабирования
                }}
              >
                {/* Изображения (абсолютное позиционирование по блоку) - можно перетаскивать */}
                {settings.snowmanEnabled && (settings.snowmanImages || []).filter(img => img.enabled !== false && img.positionType === 'absolute').map((img) => (
                  <img
                    key={img.id}
                    src={img.image || frostyImg}
                    alt={`Изображение ${img.id}`}
                    onMouseDown={(e) => {
                      handleSelectSnowmanImage(img.id);
                      handleDragStart(e, `snowman-image-${img.id}`, img.id);
                    }}
                    onTouchStart={(e) => {
                      handleSelectSnowmanImage(img.id);
                      handleDragStart(e, `snowman-image-${img.id}`, img.id);
                    }}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${img.positionX || 0}px)`,
                      top: `${img.positionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(img.scale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: draggingImageId === img.id ? 200 : (img.selected ? 150 : 100),
                      cursor: draggingImageId === img.id ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      touchAction: 'none',
                      opacity: draggingImageId === img.id ? 0.8 : (img.selected ? 0.9 : 1),
                      transition: draggingImageId === img.id ? 'none' : 'opacity 0.2s',
                      border: img.selected ? '2px solid #43e97b' : '2px solid transparent',
                      borderRadius: '4px',
                      boxShadow: img.selected ? '0 0 8px rgba(67,233,123,0.5)' : 'none',
                    }}
                    draggable={false}
                  />
                ))}
                
                {/* Обратная совместимость: старое одиночное изображение */}
                {settings.snowmanEnabled && (!settings.snowmanImages || settings.snowmanImages.length === 0) && settings.snowmanImage && settings.snowmanPositionType === 'absolute' && (
                  <img
                    src={settings.snowmanImage || frostyImg}
                    alt="Снеговик"
                    onMouseDown={(e) => handleDragStart(e, 'snowman')}
                    onTouchStart={(e) => handleDragStart(e, 'snowman')}
                    style={{
                      position: 'absolute',
                      left: `calc(50% + ${settings.snowmanPositionX || 0}px)`,
                      top: `${settings.snowmanPositionY || 0}px`,
                      transform: 'translateX(-50%)',
                      width: `${(settings.snowmanScale || 100) * 0.6}px`,
                      height: 'auto',
                      zIndex: 100,
                      cursor: dragging === 'snowman' ? 'grabbing' : 'grab',
                      userSelect: 'none',
                      touchAction: 'none',
                      opacity: dragging === 'snowman' ? 0.8 : 1,
                      transition: dragging === 'snowman' ? 'none' : 'opacity 0.2s',
                    }}
                    draggable={false}
                  />
                )}
                
                {/* Заголовок сайдбара */}
                <div style={{
                  padding: '16px 0',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1.18em',
                  letterSpacing: '0.01em',
                  color: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                  overflow: 'visible',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span role="img" aria-label="chat">💬</span> Мульти-мессенджер
                  </span>
                  {/* Снег в превью - на весь экран превью */}
                  {settings.snowEnabled !== false && (
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: '100%',
                      width: '100%',
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
                            ['--snow-y']: `calc(100% + 20px)`
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
                        transform: translate3d(var(--snow-x, 40px), var(--snow-y, calc(100% + 20px)), 0) rotate(360deg); 
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
                    background: (settings.avatarImage && settings.avatarImage.trim() !== '') ? 'transparent' : '#e3eaf2',
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
                    {(settings.avatarImage && 
                      settings.avatarImage.trim() !== '' && 
                      !settings.avatarImage.includes('Frosty.png') && 
                      settings.avatarImage !== settings.snowmanImage &&
                      (!settings.snowmanImages || !settings.snowmanImages.some(img => img.image === settings.avatarImage))) ? (
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
      </div>,
      document.body
      )}
    </>
  );
}


