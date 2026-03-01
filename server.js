const express = require('express');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

// Fix for ENOTFOUND SRV errors - Render handles this, but keeping it safe
dns.setServers(['8.8.8.8', '1.1.1.1']);

const app = express();

// IMPORTANT: Render uses its own PORT. Do not hardcode 3000.
const PORT = process.env.PORT || 10000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
        // This log helps you see exactly why MongoDB is failing on Render
    });

// Mongoose Schema Mapping
const productSchema = new mongoose.Schema({
    name: String,    // Maps to "Title"
    img: String,     // Maps to "Image URL"
    price: String,   // Maps to "Price"
    gallery: [String]
});

const siteDataSchema = new mongoose.Schema({
    siteName: String,
    ownerName: String,
    phone: String,
    email: String,
    address: String,
    slides: [String],
    products: [productSchema],
    about: String,
    adminPass: String
});

const SiteData = mongoose.model('SiteData', siteDataSchema);

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

app.use(express.json());
app.use(express.static(__dirname));

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'rohit_furniture',
        allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
    }
});
const upload = multer({ storage: storage });

// API - Upload Image
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    res.json({ url: req.file.path }); 
});

// Route for homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'user.html'));
});

// Route for admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// API - Get Website Data
app.get('/api/data', async (req, res) => {
    try {
        const data = await SiteData.findOne();
        if (!data) return res.status(404).send('No data found');
        res.json(data);
    } catch (err) {
        res.status(500).send('Error fetching data');
    }
});

// API - Save Website Data
app.post('/api/save', async (req, res) => {
    try {
        const newData = req.body;
        await SiteData.findOneAndUpdate({}, newData, { upsert: true, new: true });
        res.send('Data saved successfully');
    } catch (err) {
        console.error('Save error:', err);
        res.status(500).send('Error saving data');
    }
});

// FINAL FIX: Binding to 0.0.0.0 and using Render's PORT
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server is live on port ${PORT}`);
});
