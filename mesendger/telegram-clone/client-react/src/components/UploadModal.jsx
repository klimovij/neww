import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { Modal, ModalContent, CloseButton, Input } from '../styles/GlobalStyles';
import { FiX, FiUploadCloud, FiSearch, FiEye, FiDownload, FiTrash2, FiFileText, FiPrinter } from 'react-icons/fi';

// === Стилизация под EmployeesListModal ===
const StyledModalContent = styled(ModalContent)`
  background: linear-gradient(135deg, #232931 0%, #181c22 100%);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
  padding: 0;
  width: 90%;
  max-width: 1170px;
  height: 95vh;
  max-height: 910px;
  position: fixed;
  top: 50%;
  left: calc(50% + 170px);
  transform: translate(-50%, -50%);
  border: none;
  z-index: 100001;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 1.8rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { background: rgba(255, 255, 255, 0.2); transform: scale(1.05); }
`;

const ModalBody = styled.div`
  flex: 1;
  padding: 24px 24px 12px 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
`;

const UploadBox = styled.label`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px;
  border: 1px dashed rgba(255,255,255,0.35);
  border-radius: 12px;
  color: #e2e8f0;
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  transition: all .2s ease;
  &:hover { background: rgba(255,255,255,0.06); }
`;

const Tag = styled.span`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 10px;
  padding: 6px 10px;
  color: #cbd5e1;
  font-size: .85rem;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SearchWrap = styled.div`
  position: relative;
  flex: 1;
`;

const SuggestList = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #0b1220;
  border: 1px solid #253047;
  border-radius: 10px;
  margin-top: 6px;
  max-height: 220px;
  overflow: auto;
  z-index: 10;
`;

const SuggestItem = styled.div`
  padding: 8px 10px;
  color: #e2e8f0;
  cursor: pointer;
  &:hover { background: rgba(255,255,255,0.06); }
`;

const TableWrap = styled.div`
  flex: 1;
  overflow: auto;
  border: 1px solid #2a2f37;
  border-radius: 12px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: auto;
  min-width: 100%;
`;

const Th = styled.th`
  text-align: left;
  padding: 10px 12px;
  background: #111827;
  color: #b2bec3;
  position: sticky;
  top: 0;
  white-space: nowrap;
  &:last-child {
    width: 1%;
    white-space: nowrap;
  }
`;

const Td = styled.td`
  padding: 10px 12px;
  border-top: 1px solid #2a2f37;
  color: #e2e8f0;
  word-break: break-word;
  &:first-child {
    max-width: 250px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &:last-child {
    white-space: nowrap;
  }
`;

const PrimaryBtn = styled.button`
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 10px;
  color: #232931;
  cursor: pointer;
  font-weight: 800;
  padding: 8px 12px;
`;

const GhostBtn = styled.button`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #e2e8f0;
  cursor: pointer;
  font-weight: 700;
  padding: 8px 10px;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255,255,255,0.12);
    transform: translateY(-1px);
  }
`;

const IconBtn = styled.button`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: #e2e8f0;
  cursor: pointer;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  min-width: 32px;
  height: 32px;
  &:hover {
    background: rgba(255,255,255,0.15);
    transform: translateY(-1px);
    border-color: rgba(255,255,255,0.25);
  }
  &:active {
    transform: translateY(0);
  }
`;

const Select = styled.select`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  color: #e2e8f0;
  padding: 8px 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.25);
  }
  &:focus {
    background: rgba(255,255,255,0.12);
    border-color: #43e97b;
  }
  option {
    background: #0b1220;
    color: #e2e8f0;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

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

export default function UploadModal({ open, onClose }) {
  const fileInputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [suggest, setSuggest] = useState([]);
  const [preview, setPreview] = useState(null); // { url, mime, name }
  const [selectedDepartment, setSelectedDepartment] = useState(''); // Для загрузки
  const [filterDepartment, setFilterDepartment] = useState(''); // Для фильтрации
  const abortRef = useRef(null);

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
        // Если фильтр по подразделению установлен, фильтруем на клиенте тоже (на случай если сервер не поддерживает)
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

  // ===== DOCX preview support (client-side) =====
  const docxContainerRef = useRef(null);
  const [docxRendering, setDocxRendering] = useState(false);

  const isDocx = (doc) => {
    const name = (doc?.name || doc?.original_name || '').toLowerCase();
    const path = (doc?.path || '').toLowerCase();
    const byMime = (doc?.mime || '').includes('wordprocessingml');
    return byMime || name.endsWith('.docx') || path.endsWith('.docx');
  };

  const ensureDocxPreviewLib = async () => {
    // Need JSZip first, then docx-preview; both expose globals: window.JSZip and window.docx
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
        console.log('UploadModal.jszipLoaded', !!window.JSZip);
      }
      if (!(window.docx && window.docx.renderAsync)) {
        await loadScript('https://unpkg.com/docx-preview/dist/docx-preview.js', 'data-docx-preview');
        console.log('UploadModal.docxPreviewLoaded', !!(window.docx && window.docx.renderAsync));
      }
      return true;
    } catch (e) {
      console.log('UploadModal.ensureDocxPreviewLibError', e);
      throw e;
    }
  };

  useEffect(() => {
    // When preview for DOCX is set, render it into container
    const run = async () => {
      if (!preview || !isDocx(preview) || !docxContainerRef.current) return;
      try {
        setDocxRendering(true);
        await ensureDocxPreviewLib();
        const resp = await fetch(preview.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = await resp.arrayBuffer();
        const blob = new Blob([buf]);
        // Clear container before render
        docxContainerRef.current.innerHTML = '';
        await window.docx.renderAsync(blob, docxContainerRef.current, undefined, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          className: 'docx-preview',
        });
        console.log('UploadModal.docxRendered');
      } catch (e) {
        console.log('UploadModal.docxRenderError', e);
        // Fallback to Mammoth
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
          console.log('UploadModal.mammothRendered');
        } catch (mErr) {
          console.log('UploadModal.mammothRenderError', mErr);
          // Show a readable error message inside the modal
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

  useEffect(() => { 
    if (open) {
      fetchDocs('', filterDepartment);
      setSelectedDepartment(''); // Сбрасываем выбор при открытии
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
    
    // Проверяем, выбрано ли подразделение
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
        // Обновляем список документов с учетом фильтра
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

  const handlePrint = async (doc) => {
    try {
      const absUrl = /^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`;
      
      // Определяем тип файла
      const isPdf = doc.mime?.includes('pdf') || (doc.name || doc.original_name || '').toLowerCase().endsWith('.pdf');
      const isImage = doc.mime?.startsWith('image/');
      const isText = doc.mime?.startsWith('text/') || (doc.name || doc.original_name || '').toLowerCase().match(/\.(txt|html|htm)$/);
      
      // Для PDF, изображений и текстовых файлов - открываем в новом окне и печатаем
      if (isPdf || isImage || isText) {
        const printWindow = window.open(absUrl, '_blank');
        
        if (!printWindow) {
          alert('Не удалось открыть документ для печати. Разрешите всплывающие окна в настройках браузера.');
          return;
        }
        
        // Ждем загрузки документа и вызываем печать
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.focus();
              printWindow.print();
            } catch (err) {
              console.error('Print error:', err);
              // Если не удалось напечатать, оставляем окно открытым
            }
          }, 1000);
        };
        
        // Fallback на случай, если onload не сработает
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
      } else {
        // Для других типов файлов (DOCX, XLSX и т.д.) - открываем в новой вкладке
        // Браузер может не уметь печатать их напрямую, но пользователь сможет
        // использовать встроенные функции браузера или приложения для печати
        const win = window.open(absUrl, '_blank');
        if (!win) {
          alert('Не удалось открыть документ. Разрешите всплывающие окна в настройках браузера.');
        } else {
          // Пытаемся напечатать через некоторое время
          setTimeout(() => {
            try {
              if (win && !win.closed) {
                win.focus();
                win.print();
              }
            } catch (err) {
              console.log('Cannot print this file type directly. File opened in new tab - user can print manually.');
            }
          }, 1500);
        }
      }
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
    const ok = byMime || byExtPdf || byExtCsv;
    console.log('UploadModal.canPreviewInline', { mime, name, path, byMime, byExtPdf, byExtCsv, ok });
    if (ok) return true;
    return false;
  };

  if (!open) return null;

  return (
    <Modal onClick={onClose}>
      <StyledModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FiFileText />
            Загрузка документов
          </ModalTitle>
          <CloseBtn onClick={onClose}>
            <FiX />
          </CloseBtn>
        </ModalHeader>

        <ModalBody>
          <FilterRow>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Выберите подразделение для загрузки:</label>
              <Select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={uploading}
                style={{ width: '100%' }}
              >
                {DEPARTMENTS.filter(d => d.value !== '').map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </Select>
            </div>
            <UploadBox style={{ flex: 1, opacity: selectedDepartment ? 1 : 0.6, cursor: selectedDepartment ? 'pointer' : 'not-allowed' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                style={{ display: 'none' }}
                onChange={(e) => handleUpload(e.target.files?.[0])}
                disabled={uploading || !selectedDepartment}
              />
              <FiUploadCloud />
              <span>{uploading ? 'Загрузка...' : selectedDepartment ? 'Перетащите файл или нажмите, чтобы выбрать' : 'Сначала выберите подразделение'}</span>
            </UploadBox>
          </FilterRow>

          <FilterRow>
            <SearchWrap style={{ flex: 1 }}>
              <Input
                type="text"
                placeholder="Быстрый поиск по названию..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  // Обновляем список при изменении поиска
                  if (!e.target.value) {
                    fetchDocs('', filterDepartment);
                  }
                }}
              />
              {query && suggest.length > 0 && (
                <SuggestList>
                  {suggest.map(s => (
                    <SuggestItem key={s.id} onClick={() => { 
                      setQuery(s.name || s.original_name || ''); 
                      setSuggest([]); 
                      // Если документ соответствует текущему фильтру, добавляем его в список
                      if (!filterDepartment || s.department === filterDepartment) {
                        setDocs([s, ...docs.filter(d => d.id !== s.id)]);
                      } else {
                        // Если не соответствует фильтру, просто обновляем поиск
                        fetchDocs(s.name || s.original_name || '', filterDepartment);
                      }
                    }}>
                      <FiSearch style={{ opacity: .7, marginRight: 6 }} /> {s.name || s.original_name}
                    </SuggestItem>
                  ))}
                </SuggestList>
              )}
            </SearchWrap>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 200 }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.9rem', fontWeight: 600 }}>Фильтр по подразделению:</label>
              <Select
                value={filterDepartment}
                onChange={(e) => {
                  setFilterDepartment(e.target.value);
                  fetchDocs(query, e.target.value);
                }}
              >
                {DEPARTMENTS.map(dept => (
                  <option key={dept.value} value={dept.value}>{dept.label}</option>
                ))}
              </Select>
            </div>
          </FilterRow>

          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th style={{ minWidth: '200px', maxWidth: '300px' }}>Название</Th>
                  <Th style={{ minWidth: '120px', maxWidth: '150px' }}>Подразделение</Th>
                  <Th style={{ minWidth: '80px', maxWidth: '100px' }}>Тип</Th>
                  <Th style={{ minWidth: '80px', maxWidth: '100px' }}>Размер</Th>
                  <Th style={{ minWidth: '140px', maxWidth: '180px' }}>Дата</Th>
                  <Th style={{ minWidth: '160px', width: '160px' }}>Действия</Th>
                </tr>
              </thead>
              <tbody>
                {docs.length === 0 ? (
                  <tr><Td colSpan={6} style={{ color: '#94a3b8' }}>Нет документов</Td></tr>
                ) : (
                  docs.map(doc => (
                    <tr key={doc.id} style={{ background: 'rgba(255,255,255,0.03)' }}>
                      <Td>{doc.name || doc.original_name}</Td>
                      <Td>
                        <Tag style={{ 
                          background: doc.department ? 'rgba(67, 233, 123, 0.15)' : 'rgba(255,255,255,0.08)',
                          borderColor: doc.department ? 'rgba(67, 233, 123, 0.3)' : 'rgba(255,255,255,0.12)',
                          color: doc.department ? '#43e97b' : '#cbd5e1'
                        }}>
                          {doc.department || '—'}
                        </Tag>
                      </Td>
                      <Td>{doc.mime?.split('/')[1] || '—'}</Td>
                      <Td>{formatSize(doc.size)}</Td>
                      <Td>{formatDate(doc.created_at)}</Td>
                      <Td style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                        <IconBtn 
                          onClick={() => {
                            const abs = /^https?:\/\//i.test(doc.path) ? doc.path : `${window.location.origin}${doc.path}`;
                            const probe = { mime: doc.mime, name: doc.name || doc.original_name, path: doc.path };
                            const can = canPreviewInline(probe);
                            console.log('UploadModal.onPreviewClick', { doc, origin: window.location.origin, absUrl: abs, canPreview: can });
                            if (can) {
                              setPreview({ url: abs, mime: doc.mime, name: doc.name || doc.original_name, path: doc.path });
                            } else if (isDocx(doc)) {
                              setPreview({ url: abs, mime: doc.mime, name: doc.name || doc.original_name, path: doc.path, mode: 'docx' });
                            } else {
                              const win = window.open(abs, '_blank', 'noopener,noreferrer');
                              console.log('UploadModal.windowOpenResult', { opened: !!win });
                            }
                          }}
                          title="Просмотр"
                        >
                          <FiEye size={16} />
                        </IconBtn>
                        <IconBtn 
                          as="div"
                          style={{ cursor: 'pointer' }}
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('token');
                              // Используем API endpoint для скачивания
                              const apiUrl = `/api/documents/${doc.id}/download`;
                              const response = await fetch(apiUrl, {
                                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                              });

                              if (!response.ok) {
                                throw new Error(`Файл недоступен: ${response.status}`);
                              }

                              // Пытаемся извлечь имя файла из заголовка Content-Disposition
                              const contentDisposition = response.headers.get('Content-Disposition');
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

                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = fileName;
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
                          title="Скачать"
                        >
                          <FiDownload size={16} />
                        </IconBtn>
                        <IconBtn 
                          onClick={() => handlePrint(doc)} 
                          style={{ color: '#60a5fa', borderColor: '#60a5fa88' }}
                          title="Печать"
                        >
                          <FiPrinter size={16} />
                        </IconBtn>
                        <IconBtn 
                          onClick={() => handleDelete(doc.id)} 
                          style={{ color: '#fca5a5', borderColor: '#fca5a588' }}
                          title="Удалить"
                        >
                          <FiTrash2 size={16} />
                        </IconBtn>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableWrap>

          {preview && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100002, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setPreview(null)}>
              <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: 1000, height: '85vh', background: '#0b1220', border: '1px solid #253047', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#111827', color: '#e2e8f0' }}>
                  <div style={{ fontWeight: 800 }}>{preview.name}</div>
                  <button onClick={() => setPreview(null)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>×</button>
                </div>
                <div style={{ flex: 1, background: '#0b1220' }}>
                  {canPreviewInline(preview) ? (
                    <iframe
                      title="preview"
                      src={preview.url}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                      onLoad={() => console.log('UploadModal.iframeLoad', { url: preview.url })}
                      onError={(e) => console.log('UploadModal.iframeError', { url: preview.url, e })}
                    />
                  ) : isDocx(preview) ? (
                    <div style={{ height: '100%', overflow: 'auto', background: '#0b1220' }}>
                      <div style={{ padding: 8, color: '#94a3b8' }}>{docxRendering ? 'Загрузка DOCX...' : ''}</div>
                      <div ref={docxContainerRef} style={{ padding: 16 }} />
                    </div>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', padding: 24, textAlign: 'center' }}>
                      Предпросмотр недоступен. Скачайте файл или откройте в новой вкладке.
                      <div style={{ marginTop: 12 }}>
                        <a href={preview.url} target="_blank" rel="noreferrer">
                          <PrimaryBtn>Открыть</PrimaryBtn>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <PrimaryBtn onClick={onClose}>Закрыть</PrimaryBtn>
          </div>
        </ModalBody>
      </StyledModalContent>
    </Modal>
  );
}