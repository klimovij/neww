// Утилита для получения стилей модальных окон с поддержкой кастомных настроек

export const getModalBackgroundStyle = () => {
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--modal-background').trim() || '#1f2937';
  
  const backgroundImage = getComputedStyle(document.documentElement)
    .getPropertyValue('--modal-background-image').trim() || 'none';
  
  const backgroundOpacity = parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-background-image-opacity').trim() || '1'
  );

  return {
    background: backgroundColor,
    backgroundImage: backgroundImage !== 'none' ? backgroundImage : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    position: 'relative'
  };
};

export const getModalOverlayStyle = () => {
  const backgroundImage = getComputedStyle(document.documentElement)
    .getPropertyValue('--modal-background-image').trim() || 'none';
  
  const backgroundColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--modal-background').trim() || '#1f2937';
  
  const backgroundOpacity = parseFloat(
    getComputedStyle(document.documentElement)
      .getPropertyValue('--modal-background-image-opacity').trim() || '1'
  );

  if (backgroundImage !== 'none') {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: backgroundColor,
      opacity: 1 - backgroundOpacity,
      pointerEvents: 'none',
      zIndex: 0,
      borderRadius: 'inherit'
    };
  }
  
  return null;
};


