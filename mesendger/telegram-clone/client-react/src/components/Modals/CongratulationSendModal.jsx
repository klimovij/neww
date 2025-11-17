import React, { useState, useRef, useEffect } from 'react';
import CustomEmojiPicker from '../Common/EmojiPicker';
import api from '../../services/api';

const PROMPT = `Згенеруй розгорнуте привітання з Днем народження для співробітника. Звертайся на "ти", стиль сучасний, дружній, неофіційний, з гумором і святковим настроєм. Додай кілька різних побажань для роботи, особистого життя, здоров'я, натхнення. Використовуй смайлики у тексті. Не використовуй слово "Issa Plus" у тексті привітання, тільки у підписі в самому кінці. Не використовуй фрази про новий рік, такі як "цей рік", "наступний рік", "цей роком" — це не новорічне привітання! Приклад підпису: \n\nЗ повагою,\nКолектив Issa Plus. Не пиши привітання з нагоди прийому на роботу!`;

export default function CongratulationSendModal({ user, open, onClose, onSent }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  // file upload полностью отключен
  const [genLoading, setGenLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const editorRef = useRef(null);
  const [customEmojiMap, setCustomEmojiMap] = useState({});

  // Сброс file и fileType при открытии модального окна
  // file upload полностью отключен

  if (!open) return null;

  const handleGenerate = async () => {
    setGenLoading(true);
    try {
      const res = await api.post('/api/ai/generate', {
        name: `${user.first_name} ${user.last_name}`,
        occasion: 'день рождения',
        prompt: PROMPT
      });
      console.log('[AI GENERATE][FRONT] Ответ сервера:', res);
      if (res.data && res.data.text) {
        setText(res.data.text);
      }
    } catch (e) {
      console.error('[AI GENERATE][FRONT] Ошибка:', e, e.response);
    } finally {
      setGenLoading(false);
    }
  };

  const handleFileChange = e => {
  // file upload отключен
  return;
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      if (!user || !user.id) {
        setLoading(false);
        return;
      }
      // Берем актуальный HTML из редактора
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : text;
      await api.post('/api/congratulations/', {
        employeeId: user.id,
        congratText: currentHtml
      });
      onSent && onSent();
      onClose();
    } catch (e) {
      // Показываем ошибку только если она реально есть
      let msg = 'Ошибка отправки';
      if (e.response && e.response.data && e.response.data.error) {
        msg += ': ' + e.response.data.error;
      } else if (e.message) {
        msg += ': ' + e.message;
      }
      // Ошибки не отображаем, setError удалён
    } finally {
      setLoading(false);
    }
  };

  // Синхронизация editor DOM при изменении text программно
  useEffect(() => {
    if (editorRef.current && typeof text === 'string') {
      if (editorRef.current.innerHTML !== text) {
        editorRef.current.innerHTML = text;
      }
    }
  }, [text]);

  // Загрузка кастомных эмодзи
  useEffect(() => {
    fetch('/api/emojis/list').then(r => r.json()).then(list => {
      const map = {}; (Array.isArray(list) ? list : []).forEach(e => { map[`custom:${e.name}`] = e.url; });
      setCustomEmojiMap(map);
    }).catch(()=>{});
  }, []);

  const insertCustomEmojiAtCursor = (token) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const url = customEmojiMap[token];
    if (!url) {
      document.execCommand('insertText', false, token);
      const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
      setText(currentHtml);
      return;
    }
    const img = document.createElement('img');
    img.src = url; img.alt = token;
    img.setAttribute('data-custom-emoji', 'true');
    img.setAttribute('data-token', token);
    img.style.width = '24px'; img.style.height = '24px';
    img.style.objectFit = 'cover'; img.style.verticalAlign = 'middle';
    img.style.margin = '0 2px'; img.style.borderRadius = '6px';
    const range = window.getSelection && window.getSelection().getRangeAt && window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null;
    if (range) {
      range.deleteContents();
      range.insertNode(img);
      range.setStartAfter(img); range.setEndAfter(img);
      const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
    } else {
      editorRef.current.appendChild(img);
    }
    const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
    setText(currentHtml);
  };

  return (
    <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(34,40,49,0.82)', zIndex:4000, display:'flex', alignItems:'center', justifyContent:'center' }}>
  <div style={{ background:'#232526', color:'#fff', borderRadius:24, minWidth:600, maxWidth:800, width:'100%', padding:'54px 54px 38px 54px', boxShadow:'0 8px 40px #2193b044, 0 0 16px #43e97b55', position:'relative', fontSize:'1.05em' }}>
        <button onClick={onClose} style={{ position:'absolute', top:18, right:24, fontSize:28, background:'none', border:'none', cursor:'pointer', color:'#2193b0' }}>×</button>
        <h3 style={{ marginBottom:18, color:'#43e97b', fontWeight:800, fontSize:'1.22em' }}>Привітання для {user.first_name} {user.last_name}</h3>
        <div style={{ marginBottom:12 }}>
          <button onClick={handleGenerate} disabled={genLoading} style={{ background:'#43e97b', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700, marginBottom:8 }}>
            {genLoading ? 'Генеруємо...' : 'Згенерувати текст'}
          </button>
          <div
            ref={editorRef}
            contentEditable
            onInput={(e) => {
              const html = e.currentTarget ? e.currentTarget.innerHTML : '';
              setText(html);
            }}
            suppressContentEditableWarning
            style={{ width:'100%', minHeight:200, borderRadius:12, border:'2px solid #43e97b', padding:18, fontWeight:600, fontSize:'1.12em', marginTop:12, background:'#fff', color:'#222' }}
            placeholder="Текст привітання..."
          />
        </div>
        <div style={{ marginBottom:12, position:'relative' }}>
          {/* Инпут выбора файла скрыт по требованию */}
          <button type="button" onClick={()=>setShowEmoji(v=>!v)} style={{ background:'linear-gradient(135deg, #ffe082 0%, #fcb69f 100%)', border:'none', borderRadius:8, padding:'6px 10px', cursor:'pointer', boxShadow:'0 1px 6px #e74c3c33', color:'#232931', fontWeight:700 }}>😊 Эмодзи</button>
          {showEmoji && (
            <div style={{ position:'absolute', right:0, top:'100%', marginTop:8, zIndex:1000 }}>
              <CustomEmojiPicker
                isOpen={showEmoji}
                onClose={()=>setShowEmoji(false)}
                onEmojiSelect={(emoji)=> {
                  const token = String(emoji || '');
                  if (token.startsWith('custom:')) insertCustomEmojiAtCursor(token);
                  else if (editorRef.current) {
                    editorRef.current.focus();
                    document.execCommand('insertText', false, token);
                    const currentHtml = editorRef.current ? editorRef.current.innerHTML : '';
                    setText(currentHtml);
                  } else {
                    setText(t => (t + token).slice(0, 5000));
                  }
                }}
              />
            </div>
          )}
        </div>
        
        <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:18 }}>
          <button onClick={onClose} style={{ background:'#e74c3c', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700 }}>Відміна</button>
          <button onClick={handleSend} disabled={loading} style={{ background:'linear-gradient(135deg, #43e97b 0%, #2193b0 100%)', color:'#fff', border:'none', borderRadius:8, padding:'8px 18px', fontWeight:700 }}>
            {loading ? 'Відправляємо...' : 'Відправити'}
          </button>
        </div>
      </div>
    </div>
  );
}
