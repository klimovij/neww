// Утилиты для работы с настройками эмодзи по всему приложению

const DEFAULTS = {
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
  customEmojiInChatModal: 48
};

export function getEmojiSettings() {
  try {
    const saved = localStorage.getItem('emojiSettings');
    if (!saved) return { ...DEFAULTS };
    const parsed = JSON.parse(saved);
    return { ...DEFAULTS, ...parsed };
  } catch (_) {
    return { ...DEFAULTS };
  }
}

export function getCustomEmojiSizeForArea(area) {
  const s = getEmojiSettings();
  switch (area) {
    case 'news':
      return s.customEmojiInNews || s.customEmojiSize;
    case 'newsComments':
      return s.customEmojiInNewsComments || s.customEmojiSize;
    case 'congrats':
      return s.customEmojiInCongrats || s.customEmojiSize;
    case 'congratsComments':
      return s.customEmojiInCongratsComments || s.customEmojiSize;
    case 'chatModal':
      return s.customEmojiInChatModal || s.customEmojiSize;
    default:
      return s.customEmojiSize;
  }
}

export function subscribeEmojiSettings(callback) {
  const handler = (ev) => {
    try {
      const s = ev && ev.detail ? ev.detail : getEmojiSettings();
      callback(s);
    } catch (_) {
      callback(getEmojiSettings());
    }
  };
  window.addEventListener('emojiSettingsUpdated', handler);
  return () => window.removeEventListener('emojiSettingsUpdated', handler);
}

export const EMOJI_SETTINGS_DEFAULTS = { ...DEFAULTS };


