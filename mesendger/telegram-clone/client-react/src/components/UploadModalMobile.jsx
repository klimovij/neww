import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { FiX, FiArrowLeft, FiUploadCloud, FiSearch, FiEye, FiDownload, FiTrash2, FiFileText, FiPrinter } from 'react-icons/fi';

// Список подразделений
const DEPARTMENTS = [
  { value: '', label: 'Все подразделения' },
  { value: 'Бухгалтерия', label: 'Бухгалтерия' },
  { value: 'Возвраты', label: 'Возвраты' },
  { value: 'HR', label: 'HR' },
  { value: 'Склад', label: 'Склад' },
  { value: 'Маркетинг', label: 'Маркетинг' },
  { value: 'Колцентр', label: 'Колцентр' }
];

export default function UploadModalMobile({ open, onClose, onOpenMobileSidebar }) {
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [preview, setPreview] = useState(null);
  const [printDoc, setPrintDoc] = useState(null); // Документ для печати
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const abortRef = useRef(null);
  const docxContainerRef = useRef(null);
  const [docxRendering, setDocxRendering] = useState(false);
  const printDocxContainerRef = useRef(null);
  const [printDocxRendering, setPrintDocxRendering] = useState(false);
  
  const modalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const fetchDocs = async (q = '', department = '') => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (department) params.append('department', department);
      const url = params.toString() ? `/api/documents?${params.toString()}` : '/api/documents';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        const documents = data.documents || [];
        if (department) {
          setDocs(documents.filter(doc => doc.department === department));
        } else {
          setDocs(documents);
        }
      }
    } catch {}
  };

  const ensureMammothLib = async () => {
    if (window.mammoth && window.mammoth.convertToHtml) return true;
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-mammoth]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        existing.addEventListener('error', () => reject(new Error('mammoth load error')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/mammoth/mammoth.browser.min.js';
      s.async = true;
      s.setAttribute('data-mammoth', '1');
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('mammoth load error'));
      document.body.appendChild(s);
    });
  };

  const isDocx = (doc) => {
    const name = (doc?.name || doc?.original_name || '').toLowerCase();
    const path = (doc?.path || '').toLowerCase();
    const byMime = (doc?.mime || '').includes('wordprocessingml');
    return byMime || name.endsWith('.docx') || path.endsWith('.docx');
  };

  const ensureDocxPreviewLib = async () => {
    const loadScript = (src, attr) => new Promise((resolve, reject) => {
      const exists = document.querySelector(`script[${attr}]`);
      if (exists) {
        if (exists.dataset.loaded === '1') return resolve(true);
        exists.addEventListener('load', () => resolve(true));
        exists.addEventListener('error', () => reject(new Error(`load error: ${src}`)));
        return;
      }
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.setAttribute(attr, '1');
      s.onload = () => { s.dataset.loaded = '1'; resolve(true); };
      s.onerror = () => reject(new Error(`load error: ${src}`));
      document.body.appendChild(s);
    });
    try {
      if (!window.JSZip) {
        await loadScript('https://unpkg.com/jszip/dist/jszip.min.js', 'data-jszip');
      }
      if (!(window.docx && window.docx.renderAsync)) {
        await loadScript('https://unpkg.com/docx-preview/dist/docx-preview.js', 'data-docx-preview');
      }
      return true;
    } catch (e) {
      throw e;
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!preview || !isDocx(preview) || !docxContainerRef.current) return;
      try {
        setDocxRendering(true);
        await ensureDocxPreviewLib();
        const resp = await fetch(preview.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const blob = new Blob([buf]);
        docxContainerRef.current.innerHTML = '';
        await window.docx.renderAsync(blob, docxContainerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          className: 'docx-preview',
        });
      } catch (e) {
        try {
          await ensureMammothLib();
          const resp2 = await fetch(preview.url);
          const buf2 = await resp2.arrayBuffer();
          const result = await window.mammoth.convertToHtml({arrayBuffer: buf2});
          docxContainerRef.current.innerHTML = '';
          const wrap = document.createElement('div');
          wrap.className = 'docx-mammoth';
          wrap.style.padding = '16px';
          wrap.style.color = '#e2e8f0';
          wrap.innerHTML = result.value || '<em>Пустой документ</em>';
          docxContainerRef.current.appendChild(wrap);
        } catch (mErr) {
          if (docxContainerRef.current) {
            docxContainerRef.current.innerHTML = '<div style="padding:12px;color:#fca5a5">Не удалось отобразить DOCX. Скачайте файл или откройте в новой вкладке.</div>';
          }
        }
      } finally {
        setDocxRendering(false);
      }
    };
    run();
  }, [preview]);

  // Effect for print modal DOCX rendering
  useEffect(() => {
    const run = async () => {
      if (!printDoc || !isDocx(printDoc) || !printDocxContainerRef.current) return;
      try {
        setPrintDocxRendering(true);
        await ensureDocxPreviewLib();
        const absUrl = /^https?:\/\//i.test(printDoc.path) ? printDoc.path : `${window.location.origin}${printDoc.path}`;
        const resp = await fetch(absUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const blob = new Blob([buf]);
        printDocxContainerRef.current.innerHTML = '';
        await window.docx.renderAsync(blob, printDocxContainerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          className: 'docx-preview-print',
        });
      } catch (e) {
        try {
          await ensureMammothLib();
          const absUrl = /^https?:\/\//i.test(printDoc.path) ? printDoc.path : `${window.location.origin}${printDoc.path}`;
          const resp2 = await fetch(absUrl);
          const buf2 = await resp2.arrayBuffer();
          const result = await window.mammoth.convertToHtml({arrayBuffer: buf2});
          printDocxContainerRef.current.innerHTML = '';
          const wrap = document.createElement('div');
          wrap.className = 'docx-mammoth-print';
          wrap.style.padding = '16px';
          wrap.style.color = '#e2e8f0';
          wrap.innerHTML = result.value || '<em>Пустой документ</em>';
          printDocxContainerRef.current.appendChild(wrap);
        } catch (mErr) {
          if (printDocxContainerRef.current) {
            printDocxContainerRef.current.innerHTML = '<div style="padding:12px;color:#fca5a5">Не удалось отобразить DOCX. Скачайте файл или откройте в новой вкладке.</div>';
          }
        }
      } finally {
        setPrintDocxRendering(false);
      }
    };
    run();
  }, [printDoc]);

  useEffect(() => { 
    if (open) {
      fetchDocs('', filterDepartment);
      setSelectedDepartment('');
    }
  }, [open, filterDepartment]);

  useEffect(() => {
    if (!open) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const t = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const params = new URLSearchParams();
        if (query) params.append('q', query);
        if (filterDepartment) params.append('department', filterDepartment);
        const url = params.toString() ? `/api/documents?${params.toString()}` : '/api/documents';
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal
        });
        const data = await res.json();
        if (data.success) {
          const documents = data.documents || [];
          const filtered = filterDepartment ? documents.filter(doc => doc.department === filterDepartment) : documents;
          setSuggest(filtered.slice(0, 8));
        }
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, filterDepartment]);

  const handleUpload = async (file) => {
    if (!file) return;
    
    if (!selectedDepartment) {
      alert('Пожалуйста, выберите подразделение перед загрузкой документа');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('name', file.name);
      form.append('originalName', file.name); // Отправляем originalName в правильной кодировке UTF-8
      form.append('department', selectedDepartment);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });
      const data = await res.json();
      if (data.success) {
        setDocs(prev => [data.document, ...prev]);
        setSuggest([]);
        setQuery('');
        fetchDocs('', filterDepartment);
      } else {
        alert(data.error || 'Ошибка загрузки');
      }
    } catch (e) {
      alert('Ошибка соединения');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить документ?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDocs(prev => prev.filter(d => d.id !== id));
    } catch {}
  };

  const handlePrint = (doc) => {
    // Открываем модалку печати
    setPrintDoc(doc);
  };

  const handlePrintExecute = async () => {
    if (!printDoc) return;
    
    try {
      const absUrl = /^https?:\/\//i.test(printDoc.path) ? printDoc.path : `${window.location.origin}${printDoc.path}`;
      const isPdf = printDoc.mime?.includes('pdf') || (printDoc.name || printDoc.original_name || '').toLowerCase().endsWith('.pdf');
      const isImage = printDoc.mime?.startsWith('image/');
      const isText = printDoc.mime?.startsWith('text/') || (printDoc.name || printDoc.original_name || '').toLowerCase().match(/\.(txt|html|htm)$/);
      
      // Создаем HTML страницу с мобильными стилями для печати
      const printHTML = `
        <!DOCTYPE html>
        <html lang="ru">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=375, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
            <meta name="mobile-web-app-capable" content="yes">
            <title>Печать: ${(printDoc.name || printDoc.original_name || 'Документ').replace(/"/g, '&quot;')}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
                -webkit-tap-highlight-color: transparent;
              }
              html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
              }
              body {
                padding: 0;
                margin: 0;
                background: #ffffff;
                position: relative;
              }
              .print-content {
                width: 100%;
                height: 100vh;
                overflow: auto;
                -webkit-overflow-scrolling: touch;
              }
              @media print {
                @page {
                  size: A4;
                  margin: 0.5cm;
                }
                html, body {
                  width: 100%;
                  height: auto;
                  overflow: visible;
                }
                .print-content {
                  width: 100%;
                  height: auto;
                  overflow: visible;
                }
                .no-print {
                  display: none !important;
                }
              }
              @media screen {
                body {
                  background: #f5f5f5;
                }
                .print-content {
                  background: white;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
              }
              img {
                max-width: 100%;
                height: auto;
                display: block;
              }
              iframe {
                width: 100%;
                height: 100vh;
                border: none;
                display: block;
              }
              @media (max-width: 480px) {
                body {
                  font-size: 14px;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-content">
              ${isPdf || isImage || isText ? 
                `<iframe src="${absUrl.replace(/"/g, '&quot;')}" style="width: 100%; height: 100vh; border: none;"></iframe>` :
                `<div style="padding: 20px; text-align: center;">
                  <p style="margin-bottom: 16px;">Документ открыт для печати.</p>
                  <p style="color: #666; font-size: 0.9em;">Используйте меню браузера для печати.</p>
                </div>`
              }
            </div>
            <script>
              (function() {
                // Устанавливаем размеры viewport для мобильного устройства
                var viewport = document.querySelector('meta[name="viewport"]');
                if (viewport) {
                  viewport.setAttribute('content', 'width=375, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
                }
                
                // Запускаем печать после загрузки
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    try {
                      window.focus();
                      window.print();
                    } catch (e) {
                      console.error('Print error:', e);
                    }
                  }, 800);
                });
                
                // Fallback для старых браузеров
                if (document.readyState === 'complete') {
                  setTimeout(function() {
                    try {
                      window.focus();
                      window.print();
                    } catch (e) {
                      console.error('Print error:', e);
                    }
                  }, 800);
                }
              })();
            </script>
          </body>
        </html>
      `;
      
      // Открываем новое окно с мобильными стилями и размерами
      // Используем размеры мобильного устройства
      const mobileWidth = 375;
      const mobileHeight = 667;
      const left = (window.screen.width - mobileWidth) / 2;
      const top = (window.screen.height - mobileHeight) / 2;
      
      const printWindow = window.open(
        '', 
        '_blank', 
        `width=${mobileWidth},height=${mobileHeight},left=${left},top=${top},resizable=yes,scrollbars=yes`
      );
      
      if (!printWindow) {
        alert('Не удалось открыть документ для печати. Разрешите всплывающие окна в настройках браузера.');
        return;
      }
      
      printWindow.document.write(printHTML);
      printWindow.document.close();
      
      // Устанавливаем размеры окна после загрузки
      printWindow.addEventListener('load', () => {
        try {
          printWindow.resizeTo(mobileWidth, mobileHeight);
          printWindow.moveTo(left, top);
        } catch (e) {
          // Игнорируем ошибки изменения размера (может быть заблокировано браузером)
        }
      });
      
      // Fallback: если печать не запустилась автоматически
      setTimeout(() => {
        try {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        } catch (err) {
          console.log('Print fallback error:', err);
        }
      }, 2000);
      
      // Закрываем модалку после запуска печати
      setPrintDoc(null);
    } catch (err) {
      console.error('Print error:', err);
      alert('Ошибка при попытке печати документа. Попробуйте открыть документ и напечатать его вручную.');
    }
  };

  const formatDate = (s) => new Date(s).toLocaleString('ru-RU');
  const formatSize = (n) => {
    if (!n && n !== 0) return '';
    if (n < 1024) return `${n} B`;
    if (n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    if (n < 1024*1024*1024) return `${(n/1024/1024).toFixed(1)} MB`;
    return `${(n/1024/1024/1024).toFixed(1)} GB`;
  };
  
  const canPreviewInline = (doc) => {
    const mime = doc?.mime || '';
    const name = (doc?.name || doc?.original_name || '').toLowerCase();
    const path = (doc?.path || '').toLowerCase();
    const byMime = /pdf|text\/csv/.test(mime);
    const byExtPdf = name.endsWith('.pdf') || path.endsWith('.pdf');
    const byExtCsv = name.endsWith('.csv') || path.endsWith('.csv');
    return byMime || byExtPdf || byExtCsv;
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
          zIndex: 100001,
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
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 100002,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
            }}
          >
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <FiArrowLeft size={24} />
            </button>
            <h2
              style={{
                margin: 0,
                color: '#fff',
                fontWeight: 900,
                fontSize: '1.1em',
                flex: 1,
                textAlign: 'center',
                paddingRight: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FiFileText size={20} />
              Загрузка документов
            </h2>
            <button
              onClick={handleClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
              }}
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Swipe hint */}
          <div
            style={{
              position: 'fixed',
              top: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(102, 126, 234, 0.2)',
              color: '#c084fc',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              zIndex: 100002,
              pointerEvents: 'none',
              animation: 'fadeOut 3s forwards',
            }}
          >
            ← Свайпните влево, чтобы закрыть
          </div>
          <style>{`
            @keyframes fadeOut {
              0% { opacity: 1; }
              70% { opacity: 1; }
              100% { opacity: 0; }
            }
          `}</style>

          {/* Content */}
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Upload section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>
                Выберите подразделение для загрузки:
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={uploading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="">Выберите подразделение</option>
                {DEPARTMENTS.filter(d => d.value !== '').map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </select>
              
              <label
                htmlFor="file-upload-mobile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  padding: '16px',
                  border: '1px dashed rgba(255,255,255,0.35)',
                  borderRadius: '12px',
                  color: '#e2e8f0',
                  background: selectedDepartment ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  cursor: selectedDepartment ? 'pointer' : 'not-allowed',
                  opacity: selectedDepartment ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              >
                <input
                  id="file-upload-mobile"
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  style={{ display: 'none' }}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                  disabled={uploading || !selectedDepartment}
                />
                <FiUploadCloud size={20} />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  {uploading ? 'Загрузка...' : selectedDepartment ? 'Нажмите, чтобы выбрать файл' : 'Сначала выберите подразделение'}
                </span>
              </label>
            </div>

            {/* Search and filter */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Быстрый поиск по названию..."
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (!e.target.value) {
                      fetchDocs('', filterDepartment);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e2e8f0',
                    fontSize: '0.95rem',
                    outline: 'none'
                  }}
                />
                {query && suggest.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: '#0b1220',
                    border: '1px solid #253047',
                    borderRadius: '10px',
                    marginTop: '6px',
                    maxHeight: '220px',
                    overflow: 'auto',
                    zIndex: 10
                  }}>
                    {suggest.map(s => (
                      <div
                        key={s.id}
                        onClick={() => { 
                          setQuery(s.name || s.original_name || ''); 
                          setSuggest([]); 
                          if (!filterDepartment || s.department === filterDepartment) {
                            setDocs([s, ...docs.filter(d => d.id !== s.id)]);
                          } else {
                            fetchDocs(s.name || s.original_name || '', filterDepartment);
                          }
                        }}
                        style={{
                          padding: '10px 12px',
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(255,255,255,0.05)'
                        }}
                      >
                        <FiSearch style={{ opacity: 0.7, marginRight: 6, display: 'inline' }} />
                        {s.name || s.original_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Фильтр по подразделению:
                </label>
                <select
                  value={filterDepartment}
                  onChange={(e) => {
                    setFilterDepartment(e.target.value);
                    fetchDocs(query, e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#e2e8f0',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept.value} value={dept.value}>{dept.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Documents list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {docs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                  Нет документов
                </div>
              ) : (
                docs.map(doc => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.95rem', wordBreak: 'break-word' }}>
                        {doc.name || doc.original_name}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{
                          background: doc.department ? 'rgba(67, 233, 123, 0.15)' : 'rgba(255,255,255,0.08)',
                          border: `1px solid ${doc.department ? 'rgba(67, 233, 123, 0.3)' : 'rgba(255,255,255,0.12)'}`,
                          color: doc.department ? '#43e97b' : '#cbd5e1',
                          borderRadius: '10px',
                          padding: '4px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 600
                        }}>
                          {doc.department || '—'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {doc.mime?.split('/')[1] || '—'}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {formatSize(doc.size)}
                        </span>
                        <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          const abs = /^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`;
                          const probe = { mime: doc.mime, name: doc.name || doc.original_name, path: doc.path };
                          const can = canPreviewInline(probe);
                          if (can) {
                            setPreview({ url: abs, mime: doc.mime, name: doc.name || doc.original_name, path: doc.path });
                          } else if (isDocx(doc)) {
                            setPreview({ url: abs, mime: doc.mime, name: doc.name || doc.original_name, path: doc.path, mode: 'docx' });
                          } else {
                            window.open(abs, '_blank', 'noopener,noreferrer');
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <FiEye size={16} /> Просмотр
                      </button>
                      <a
                        href={/^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`}
                        download={doc.original_name || doc.name || doc.path.split('/').pop()}
                        onClick={async (e) => {
                          // Если прямой путь не работает, пробуем через API
                          e.preventDefault();
                          try {
                            const token = localStorage.getItem('token');
                            const absUrl = /^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`;
                            
                            // Пробуем скачать через fetch
                            const response = await fetch(absUrl, {
                              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
                              method: 'GET'
                            });

                            if (!response.ok) {
                              // Если прямой путь не работает, пробуем через API endpoint для документов
                              const apiUrl = `/api/documents/${doc.id}/download`;
                              const apiResponse = await fetch(apiUrl, {
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                              });
                              
                              if (!apiResponse.ok) {
                                throw new Error(`Файл недоступен: ${apiResponse.status}`);
                              }
                              
                              // Пытаемся извлечь имя файла из заголовка Content-Disposition
                              // Сервер должен исправить кодировку, поэтому используем имя из заголовка
                              const contentDisposition = apiResponse.headers.get('Content-Disposition');
                              let fileName = doc.original_name || doc.name || doc.path.split('/').pop();
                              
                              // Приоритет: имя из заголовка (исправленное сервером) > имя из базы данных
                              if (contentDisposition) {
                                // Пытаемся извлечь имя из filename*=UTF-8''... (приоритет)
                                const utf8Match = contentDisposition.match(/filename\*=UTF-8''(.+?)(?:;|$)/);
                                if (utf8Match) {
                                  try {
                                    const decoded = decodeURIComponent(utf8Match[1]);
                                    if (decoded && decoded.length > 0) {
                                      fileName = decoded;
                                    }
                                  } catch (e) {
                                    console.warn('Не удалось декодировать имя файла из UTF-8 заголовка:', e);
                                  }
                                } else {
                                  // Пытаемся извлечь из filename="..."
                                  const quotedMatch = contentDisposition.match(/filename="(.+?)"/);
                                  if (quotedMatch) {
                                    fileName = quotedMatch[1];
                                  }
                                }
                              }
                              
                              // Нормализуем имя файла - убираем недопустимые символы для Windows
                              fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');
                              
                              const blob = await apiResponse.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = fileName;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              return;
                            }

                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = doc.original_name || doc.name || doc.path.split('/').pop();
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          } catch (error) {
                            console.error('Ошибка скачивания файла:', error);
                            alert('Не удалось скачать файл. Попробуйте открыть его в новой вкладке.');
                            // Fallback: открываем в новой вкладке
                            const absUrl = /^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`;
                            window.open(absUrl, '_blank');
                          }
                        }}
                        style={{
                          flex: 1,
                          textDecoration: 'none',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <FiDownload size={16} /> Скачать
                      </a>
                      <button
                        onClick={() => handlePrint(doc)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(96, 165, 250, 0.3)',
                          background: 'rgba(96, 165, 250, 0.1)',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <FiPrinter size={16} /> Печать
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        style={{
                          flex: 1,
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid rgba(252, 165, 165, 0.3)',
                          background: 'rgba(252, 165, 165, 0.1)',
                          color: '#fca5a5',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 600
                        }}
                      >
                        <FiTrash2 size={16} /> Удалить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Print modal */}
          {printDoc && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 100004,
                display: 'flex',
                flexDirection: 'column',
                padding: 0
              }}
              onClick={() => setPrintDoc(null)}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => {
                if (!touchStartX.current || !touchEndX.current) return;
                const distance = touchStartX.current - touchEndX.current;
                const minSwipeDistance = 50;
                if (distance > minSwipeDistance) {
                  setPrintDoc(null);
                }
                touchStartX.current = null;
                touchEndX.current = null;
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0b1220',
                  border: 'none',
                  borderRadius: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Header */}
                {ReactDOM.createPortal(
                  <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#111827',
                    color: '#e2e8f0',
                    borderBottom: '1px solid #253047',
                    zIndex: 100005
                  }}>
                    <button
                      onClick={() => setPrintDoc(null)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        fontSize: 24,
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FiArrowLeft size={20} />
                    </button>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', wordBreak: 'break-word', flex: 1, padding: '0 12px', textAlign: 'center' }}>
                      {printDoc.name || printDoc.original_name || 'Печать документа'}
                    </div>
                    <button
                      onClick={handlePrintExecute}
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiPrinter size={16} /> Печать
                    </button>
                  </div>,
                  document.body
                )}
                
                {/* Swipe hint */}
                {ReactDOM.createPortal(
                  <div style={{
                    position: 'fixed',
                    bottom: 20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.75rem',
                    zIndex: 100005,
                    pointerEvents: 'none'
                  }}>
                    ← Проведите влево, чтобы закрыть
                  </div>,
                  document.body
                )}

                {/* Content */}
                <div style={{
                  flex: 1,
                  background: '#0b1220',
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  minHeight: 0,
                  marginTop: '60px'
                }}>
                  {canPreviewInline(printDoc) ? (
                    <iframe
                      title="print-preview"
                      src={/^https?:\/\//i.test(printDoc.path) ? printDoc.path : `${window.location.origin}${printDoc.path}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        minHeight: 'calc(100vh - 60px)',
                        display: 'block'
                      }}
                    />
                  ) : isDocx(printDoc) ? (
                    <>
                      <style>{`
                        .docx-preview-print {
                          max-width: 100% !important;
                          width: 100% !important;
                          box-sizing: border-box !important;
                        }
                        .docx-preview-print * {
                          max-width: 100% !important;
                          word-wrap: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                        .docx-preview-print table {
                          width: 100% !important;
                          max-width: 100% !important;
                          table-layout: auto !important;
                          display: block !important;
                          overflow-x: auto !important;
                        }
                        .docx-preview-print img {
                          max-width: 100% !important;
                          height: auto !important;
                        }
                        .docx-mammoth-print {
                          max-width: 100% !important;
                          width: 100% !important;
                          box-sizing: border-box !important;
                        }
                        .docx-mammoth-print * {
                          max-width: 100% !important;
                          word-wrap: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                        .docx-mammoth-print table {
                          width: 100% !important;
                          max-width: 100% !important;
                          table-layout: auto !important;
                          display: block !important;
                          overflow-x: auto !important;
                        }
                        .docx-mammoth-print img {
                          max-width: 100% !important;
                          height: auto !important;
                        }
                      `}</style>
                      <div style={{
                        flex: 1,
                        overflow: 'auto',
                        background: '#0b1220',
                        WebkitOverflowScrolling: 'touch',
                        minHeight: 0
                      }}>
                        <div style={{ padding: '12px 16px', color: '#94a3b8', marginBottom: '8px', fontSize: '0.85rem' }}>
                          {printDocxRendering ? 'Загрузка DOCX...' : ''}
                        </div>
                        <div
                          ref={printDocxContainerRef}
                          style={{
                            padding: '16px',
                            color: '#e2e8f0',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{
                      minHeight: 'calc(100vh - 60px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      padding: 24,
                      textAlign: 'center',
                      gap: '16px'
                    }}>
                      <div>Предпросмотр недоступен для печати. Нажмите кнопку "Печать" для открытия документа.</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview modal */}
          {preview && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 100003,
                display: 'flex',
                flexDirection: 'column',
                padding: 0
              }}
              onClick={() => setPreview(null)}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#0b1220',
                  border: 'none',
                  borderRadius: 0,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#111827',
                  color: '#e2e8f0',
                  borderBottom: '1px solid #253047',
                  flexShrink: 0
                }}>
                  <div style={{ fontWeight: 800, fontSize: '0.9rem', wordBreak: 'break-word', flex: 1, paddingRight: '12px' }}>
                    {preview.name}
                  </div>
                  <button
                    onClick={() => setPreview(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#fff',
                      fontSize: 24,
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      flexShrink: 0
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{
                  flex: 1,
                  background: '#0b1220',
                  overflow: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  minHeight: 0
                }}>
                  {canPreviewInline(preview) ? (
                    <iframe
                      title="preview"
                      src={preview.url}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        minHeight: 'calc(100vh - 60px)',
                        display: 'block'
                      }}
                    />
                  ) : isDocx(preview) ? (
                    <>
                      <style>{`
                        .docx-preview {
                          max-width: 100% !important;
                          width: 100% !important;
                          box-sizing: border-box !important;
                        }
                        .docx-preview * {
                          max-width: 100% !important;
                          word-wrap: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                        .docx-preview table {
                          width: 100% !important;
                          max-width: 100% !important;
                          table-layout: auto !important;
                          display: block !important;
                          overflow-x: auto !important;
                        }
                        .docx-preview img {
                          max-width: 100% !important;
                          height: auto !important;
                        }
                        .docx-mammoth {
                          max-width: 100% !important;
                          width: 100% !important;
                          box-sizing: border-box !important;
                        }
                        .docx-mammoth * {
                          max-width: 100% !important;
                          word-wrap: break-word !important;
                          overflow-wrap: break-word !important;
                        }
                        .docx-mammoth table {
                          width: 100% !important;
                          max-width: 100% !important;
                          table-layout: auto !important;
                          display: block !important;
                          overflow-x: auto !important;
                        }
                        .docx-mammoth img {
                          max-width: 100% !important;
                          height: auto !important;
                        }
                      `}</style>
                      <div style={{
                        flex: 1,
                        overflow: 'auto',
                        background: '#0b1220',
                        WebkitOverflowScrolling: 'touch',
                        minHeight: 0
                      }}>
                        <div style={{ padding: '12px 16px', color: '#94a3b8', marginBottom: '8px', fontSize: '0.85rem' }}>
                          {docxRendering ? 'Загрузка DOCX...' : ''}
                        </div>
                        <div
                          ref={docxContainerRef}
                          style={{
                            padding: '16px',
                            color: '#e2e8f0',
                            maxWidth: '100%',
                            boxSizing: 'border-box',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        />
                      </div>
                    </>
                  ) : (
                    <div style={{
                      minHeight: 'calc(100vh - 60px)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      padding: 24,
                      textAlign: 'center',
                      gap: '16px'
                    }}>
                      <div>Предпросмотр недоступен. Скачайте файл или откройте в новой вкладке.</div>
                      <a
                        href={preview.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '12px 24px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                          color: '#232931',
                          textDecoration: 'none',
                          fontWeight: 800,
                          fontSize: '0.9rem'
                        }}
                      >
                        Открыть
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

