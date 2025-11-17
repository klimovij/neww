const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const csvParse = require('csv-parse/sync');
const pdfParse = require('pdf-parse');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '../uploads/knowledge') });
const knowledgeBasePath = path.join(__dirname, '../../knowledgeBase.md');

function appendToKnowledgeBase(text, filename) {
  // Попытка декодировать имя файла из latin1 в utf8, если есть кракозябры
  let decodedName = filename;
  if (/[^\u0000-\u007F]/.test(filename)) {
    try {
      decodedName = Buffer.from(filename, 'latin1').toString('utf8');
    } catch (e) {
      decodedName = filename;
    }
  }
  const header = `\n\n---\nДокумент: ${decodedName}\n---\n`;
  fs.appendFileSync(knowledgeBasePath, header + text);
}

router.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не получен' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  let text = '';
  try {
    if (ext === '.docx' || ext === '.doc') {
      const result = await mammoth.extractRawText({ path: req.file.path });
      text = result.value;
    } else if (ext === '.xlsx' || ext === '.xls') {
      const workbook = xlsx.readFile(req.file.path);
      text = workbook.SheetNames.map(name => xlsx.utils.sheet_to_csv(workbook.Sheets[name])).join('\n');
    } else if (ext === '.csv') {
      const content = fs.readFileSync(req.file.path, 'utf-8');
      const records = csvParse.parse(content, { columns: false, skip_empty_lines: true });
      text = records.map(row => row.join(' | ')).join('\n');
    } else if (ext === '.txt' || ext === '.md') {
      text = fs.readFileSync(req.file.path, 'utf-8');
    } else if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else {
      return res.status(400).json({ error: 'Неподдерживаемый формат файла' });
    }
    appendToKnowledgeBase(text, req.file.originalname);
    res.json({ ok: true, message: 'Документ добавлен в базу знаний!' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка обработки файла', details: e.message });
  } finally {
    fs.unlink(req.file.path, () => {}); // удаляем временный файл
  }
});

// Эндпоинт для очистки базы знаний
router.post('/clear', (req, res) => {
  try {
    fs.writeFileSync(knowledgeBasePath, '');
    res.json({ ok: true, message: 'База знаний очищена!' });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка очистки базы', details: e.message });
  }
});

// Эндпоинт для предпросмотра базы знаний
router.get('/preview', (req, res) => {
  try {
    if (!fs.existsSync(knowledgeBasePath)) return res.send('База знаний пуста.');
    const text = fs.readFileSync(knowledgeBasePath, 'utf-8');
    res.send(text || 'База знаний пуста.');
  } catch (e) {
    res.status(500).send('Ошибка предпросмотра базы знаний');
  }
});

module.exports = router;
