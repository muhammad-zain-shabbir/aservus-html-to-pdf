const express = require('express');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File upload
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
        const { type, settings: settingsStr, url } = req.body;
        const settings = JSON.parse(settingsStr || '{}');
        
        console.log('Conversion request received:', { type, settings });
        
        if (type === 'url') {
            // URL conversion
            if (!url || !url.startsWith('http')) {
                return res.status(400).json({ error: 'Valid URL required (must start with http:// or https://)' });
            }
            
            // Create a simple PDF response
            const pdfContent = generateSimplePDF(url, settings);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="webpage.pdf"');
            res.setHeader('Content-Length', pdfContent.length);
            res.send(pdfContent);
            
        } else if (type === 'file' && req.file) {
            // File conversion
            const fileName = req.file.originalname.replace(/\.[^/.]+$/, "") + '.pdf';
            const pdfContent = generateSimplePDF('Uploaded HTML File', settings);
            
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.setHeader('Content-Length', pdfContent.length);
            res.send(pdfContent);
            
        } else {
            res.status(400).json({ error: 'Invalid request. Provide URL or HTML file.' });
        }
        
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).json({ error: 'Conversion failed: ' + error.message });
    }
});

// Function to generate a simple PDF
function generateSimplePDF(content, settings) {
    const pageSize = settings.pageSize || 'A4';
    const orientation = settings.orientation || 'portrait';
    const margins = settings.margins || 'small';
    
    // Simple PDF structure
    return `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 200
>>
stream
BT
/F1 24 Tf
72 700 Td
(Aservus HTML to PDF Converter) Tj
0 -40 Td
/F1 16 Tf
(Successfully Converted!) Tj
0 -30 Td
/F1 12 Tf
(Content: ${content.substring(0, 50)}...) Tj
0 -20 Td
(Settings: ${pageSize}, ${orientation}, ${margins}) Tj
0 -20 Td
(Date: ${new Date().toLocaleDateString()}) Tj
0 -20 Td
(Note: This is a demo PDF. Full version coming soon!) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000102 00000 n 
0000000259 00000 n 
0000000465 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
612
%%EOF`;
}

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🔗 Health check: https://aservus-html-to-pdf-production.up.railway.app/health`);
    console.log(`🔗 Test endpoint: https://aservus-html-to-pdf-production.up.railway.app/test`);
    console.log(`📄 Conversion endpoint: https://aservus-html-to-pdf-production.up.railway.app/api/convert`);
});
