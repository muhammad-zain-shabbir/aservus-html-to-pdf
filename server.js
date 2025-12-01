const express = require('express');
const multer = require('multer');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// File upload configuration
// Use upload.any() to accept dynamic field names like "htmlFile0"
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit per file
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'puppeteer-pdf-converter',
        version: '2.0.0'
    });
});

// Main conversion endpoint
app.post('/api/convert', upload.any(), async (req, res) => {
    let browser = null;
    try {
        const { type, settings: settingsStr, url } = req.body;
        
        // Parse settings or use defaults
        let settings = {};
        try {
            settings = JSON.parse(settingsStr || '{}');
        } catch (e) {
            console.warn('Failed to parse settings, using defaults');
        }
        
        console.log(`🚀 Processing ${type} request`);

        // 1. Launch Puppeteer (Headless Chrome)
        // These arguments are MANDATORY for Railway/Docker environments
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Prevents crashing on low memory
                '--single-process', // Optimization for containerized apps
                '--no-zygote'
            ]
        });

        const page = await browser.newPage();

        // 2. Load Content based on type
        if (type === 'url') {
            if (!url || !url.startsWith('http')) {
                throw new Error('Invalid URL provided');
            }
            
            // Navigate to URL
            await page.goto(url, { 
                waitUntil: ['domcontentloaded', 'networkidle0'],
                timeout: 30000 // 30s timeout
            });
            
        } else if (type === 'file') {
            // Check if files exist in the request
            if (!req.files || req.files.length === 0) {
                throw new Error('No HTML file uploaded');
            }

            // We handle the first file (since frontend sends files individually in current logic)
            const file = req.files[0];
            const htmlContent = file.buffer.toString('utf-8');
            
            // Load HTML directly
            await page.setContent(htmlContent, { 
                waitUntil: ['domcontentloaded', 'networkidle0'],
                timeout: 30000
            });
        } else {
            throw new Error('Invalid conversion type');
        }

        // 3. Map Settings to Puppeteer Options
        const pdfOptions = {
            printBackground: settings.includeBackground === true,
            landscape: settings.orientation === 'landscape',
            format: settings.pageSize || 'A4',
            margin: {
                top: mapMargin(settings.margins),
                right: mapMargin(settings.margins),
                bottom: mapMargin(settings.margins),
                left: mapMargin(settings.margins)
            }
        };

        // 4. Generate PDF Buffer
        const pdfBuffer = await page.pdf(pdfOptions);

        // 5. Send Response
        res.setHeader('Content-Type', 'application/pdf');
        const downloadName = (type === 'url' ? 'website.pdf' : 'converted.pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('❌ Conversion Error:', error);
        
        // Only send error response if headers haven't been sent
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Conversion failed', 
                details: error.message 
            });
        }
    } finally {
        // ALWAYS close the browser to free up memory
        if (browser) {
            await browser.close();
        }
    }
});

// Helper: Convert abstract margin names to CSS values
function mapMargin(marginName) {
    switch (marginName) {
        case 'none': return '0px';
        case 'small': return '15px'; // ~0.5 inch
        case 'large': return '50px'; // ~2 inches
        case 'medium': 
        default: return '25px'; // ~1 inch
    }
}

app.listen(PORT, () => {
    console.log(`✅ Puppeteer PDF Server running on port ${PORT}`);
});