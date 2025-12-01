const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File upload setup
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'html-to-pdf-converter',
        message: 'Service is running. Puppeteer will be installed on first request.'
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'HTML to PDF converter is working!' });
});

// Main conversion endpoint (simplified for now)
app.post('/api/convert', upload.single('htmlFile'), async (req, res) => {
    try {
        // For now, just return a success message
        // We'll add Puppeteer later
        res.json({ 
            success: true, 
            message: 'PDF conversion endpoint is ready',
            note: 'Puppeteer will be installed on first request'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`Test endpoint: http://localhost:${PORT}/test`);
});
