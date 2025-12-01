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
// Using memory storage to handle files in RAM before processing
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'puppeteer-pdf-converter',
        timestamp: new Date().toISOString()
    });
});

// Main conversion endpoint
// We use upload.any() to fix the "Unexpected field" error. 
// This accepts files with any field name (htmlFile0, htmlFile1, etc.)
app.post('/api/convert', upload.any(), async (req, res) => {
    let browser = null;
    try {
        const { type, settings: settingsStr, url } = req.body;
        const settings = JSON.parse(settingsStr || '{}');
        
        console.log('🚀 Processing request:', { type, url });

        // 1. Launch Puppeteer (Headless Chrome)
        // These args are CRITICAL for running on Railway/Docker
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process' // Helps with memory on free tiers
            ]
        });

        const page = await browser.newPage();

        // 2. Load Content
        if (type === 'url') {
            if (!url || !url.startsWith('http')) {
                throw new Error('Invalid URL provided');
            }
            // Navigate to URL and wait for network to be idle (page fully loaded)
            await page.goto(url, { 
                waitUntil: ['networkidle0', 'domcontentloaded'],
                timeout: 30000 // 30 second timeout
            });
        } 
        else if (type === 'file') {
            // Find the first uploaded file in the request
            // req.files is an array because we used upload.any()
            const uploadedFile = req.files && req.files.length > 0 ? req.files[0] : null;
            
            if (!uploadedFile) {
                throw new Error('No HTML file uploaded');
            }

            // Convert buffer to string and set as page content
            const htmlContent = uploadedFile.buffer.toString('utf-8');
            await page.setContent(htmlContent, { 
                waitUntil: ['networkidle0', 'domcontentloaded'] 
            });
        } else {
            throw new Error('Invalid conversion type');
        }

        // 3. Apply Settings (Map frontend settings to Puppeteer options)
        const pdfOptions = {
            printBackground: settings.includeBackground || false,
            landscape: settings.orientation === 'landscape',
            format: settings.pageSize || 'A4',
            margin: {
                top: mapMargin(settings.margins),
                right: mapMargin(settings.margins),
                bottom: mapMargin(settings.margins),
                left: mapMargin(settings.margins)
            }
        };

        // 4. Generate PDF
        const pdfBuffer = await page.pdf(pdfOptions);

        // 5. Send Response
        res.setHeader('Content-Type', 'application/pdf');
        // Encode filename to handle special characters safely
        const filename = (type === 'url' ? 'website.pdf' : 'converted.pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('❌ Conversion Error:', error);
        // Ensure we send a JSON response on error so frontend handles it gracefully
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Conversion failed', 
                details: error.message 
            });
        }
    } finally {
        // ALWAYS close the browser to free up RAM
        if (browser) {
            await browser.close();
        }
    }
});

// Helper: Map abstract margin settings to real values
function mapMargin(marginSetting) {
    switch (marginSetting) {
        case 'none': return '0px';
        case 'small': return '20px';
        case 'large': return '50px';
        case 'medium': // Default
        default: return '30px';
    }
}

app.listen(PORT, () => {
    console.log(`✅ Puppeteer PDF Server running on port ${PORT}`);
});
