const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Allow all origins for now
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// File upload setup
const upload = multer({ storage: multer.memoryStorage() });

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'html-to-pdf-converter',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'HTML to PDF converter is working!',
        endpoints: {
            health: '/health',
            convert: '/api/convert (POST)',
            test: '/test'
        }
    });
});

// Main conversion endpoint
app.post('/api/convert', upload.single('htmlFile'), async (req, res) => {
    try {
        const { type, settings } = req.body;
        const settingsObj = JSON.parse(settings || '{}');
        
        console.log('Conversion request:', { type, settings: settingsObj });
        
        if (type === 'url') {
            // For URL conversion - return a dummy PDF for now
            const dummyPDF = Buffer.from('This is a placeholder PDF. Real PDF conversion will be added soon.');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
            res.send(dummyPDF);
            
        } else if (type === 'file' && req.file) {
            // For file upload - return a dummy PDF
            const dummyPDF = Buffer.from('This is a placeholder PDF. Real PDF conversion will be added soon.');
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
            res.send(dummyPDF);
            
        } else {
            res.status(400).json({ error: 'Invalid request' });
        }
        
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Test endpoint: http://localhost:${PORT}/test`);
    console.log(`📄 Conversion endpoint: http://localhost:${PORT}/api/convert`);
});
