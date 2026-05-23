// Lightweight server with local JSON fallback for data and local uploads.
const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(path.join(__dirname, 'public'))) fs.mkdirSync(path.join(__dirname, 'public'));
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use('/uploads', express.static(UPLOAD_DIR));

function loadData() {
    if (fs.existsSync(DATA_FILE)) {
        try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { }
    }
    const defaultData = {
        siteName: 'Pradumn Furniture',
        about: 'Welcome to Pradumn Furniture',
        slides: [],
        products: [],
        adminPass: 'admin123'
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2));
    return defaultData;
}

function saveData(obj) { fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)); }

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage });

// Serve pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'user.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// API - get site data
app.get('/api/data', (req, res) => {
    const data = loadData();
    res.json(data);
});

// API - simple login check
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const data = loadData();
    if (password && password === data.adminPass) return res.json({ ok: true });
    res.status(401).json({ ok: false });
});

// API - upload image (local)
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = '/uploads/' + path.basename(req.file.path);
    res.json({ url });
});

// API - save site data (no password required for local compatibility)
app.post('/api/save', (req, res) => {
    const payload = req.body || {};
    const data = loadData();

    // Merge allowed fields
    const allowed = ['siteName', 'about', 'slides', 'products', 'adminPass'];
    allowed.forEach(k => { if (k in payload) data[k] = payload[k]; });
    saveData(data);
    res.json({ ok: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
