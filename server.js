/*
 * File: backend/server.js
 * Description: Node.js Express server for HTML to PDF conversion using Puppeteer
 */

const express = require('express');
const multer = require('multer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for simplicity, configure properly in production
}));
app.use(cors());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/convert', limiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// File upload configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept HTML files
        if (file.mimetype === 'text/html' || 
            file.mimetype === 'application/xhtml+xml' ||
            file.originalname.toLowerCase().endsWith('.html') ||
            file.originalname.toLowerCase().endsWith('.htm')) {
            cb(null, true);
        } else {
            cb(new Error('Only HTML files are allowed'));
        }
    }
});

// PDF Conversion Settings Mapping
const pageSizeMap = {
    'A4': { width: '8.27in', height: '11.69in' },
    'Letter': { width: '8.5in', height: '11in' },
    'Legal': { width: '8.5in', height: '14in' },
    'Tabloid': { width: '11in', height: '17in' }
};

const marginMap = {
    'none': '0',
    'small': '0.5in',
    'medium': '1in',
    'large': '2in'
};

// Global browser instance for performance
let browser;

async function launchBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-accelerated-2d-canvas',
                '--disable-web-security',
                '--window-size=1920,1080'
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || puppeteer.executablePath(),
        });
        console.log('Browser launched successfully');
    }
    return browser;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        service: 'html-to-pdf-converter',
        uptime: process.uptime()
    });
});

// Main conversion endpoint
app.post('/api/convert', upload.single('htmlFile'), async (req, res) => {
    let page = null;
    let tempFilePath = null;
    
    try {
        const { type, settings: settingsStr } = req.body;
        const settings = JSON.parse(settingsStr || '{}');
        
        // Validate request
        if (!type || (type === 'url' && !req.body.url)) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        
        if (type === 'file' && !req.file) {
            return res.status(400).json({ error: 'No HTML file uploaded' });
        }
        
        console.log(`Starting conversion for ${type}:`, {
            url: type === 'url' ? req.body.url : 'file upload',
            settings
        });
        
        // Launch or get browser
        const browser = await launchBrowser();
        
        // Create new page
        page = await browser.newPage();
        
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Handle file upload
        if (type === 'file') {
            const htmlContent = req.file.buffer.toString('utf8');
            tempFilePath = path.join(__dirname, 'temp', `temp-${Date.now()}.html`);
            
            // Create temp directory if it doesn't exist
            await fs.mkdir(path.dirname(tempFilePath), { recursive: true });
            
            // Write HTML to temp file
            await fs.writeFile(tempFilePath, htmlContent);
            
            // Load from file
            await page.goto(`file://${tempFilePath}`, {
                waitUntil: settings.waitForLoad ? 'networkidle0' : 'load',
                timeout: 60000
            });
        } else {
            // Load from URL
            await page.goto(req.body.url, {
                waitUntil: settings.waitForLoad ? 'networkidle0' : 'load',
                timeout: 60000
            });
        }
        
        // Wait for additional content if specified
        if (settings.waitForLoad) {
            await page.waitForTimeout(2000); // Additional wait for dynamic content
        }
        
        // Prepare PDF options
        const pdfOptions = {
            format: settings.pageSize || 'A4',
            landscape: settings.orientation === 'landscape',
            printBackground: settings.includeBackground || false,
            margin: {
                top: marginMap[settings.margins] || marginMap.small,
                right: marginMap[settings.margins] || marginMap.small,
                bottom: marginMap[settings.margins] || marginMap.small,
                left: marginMap[settings.margins] || marginMap.small,
            },
            scale: 1,
            displayHeaderFooter: false,
            preferCSSPageSize: true,
            timeout: 120000 // 2 minute timeout for PDF generation
        };
        
        // Custom page size if not standard
        if (pageSizeMap[settings.pageSize]) {
            pdfOptions.format = undefined;
            pdfOptions.width = pageSizeMap[settings.pageSize].width;
            pdfOptions.height = pageSizeMap[settings.pageSize].height;
        }
        
        // Generate PDF
        const pdfBuffer = await page.pdf(pdfOptions);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="converted.pdf"');
        res.setHeader('Content-Length', pdfBuffer.length);
        
        // Send PDF
        res.send(pdfBuffer);
        
        console.log(`Conversion completed successfully. PDF size: ${pdfBuffer.length} bytes`);
        
    } catch (error) {
        console.error('Conversion error:', error);
        
        // Provide user-friendly error messages
        let errorMessage = 'Conversion failed';
        
        if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
            errorMessage = 'Website not found. Please check the URL and try again.';
        } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
            errorMessage = 'Cannot connect to website. The site may be down or blocking access.';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Conversion timed out. The website may be too large or loading slowly.';
        } else if (error.message.includes('invalid URL')) {
            errorMessage = 'Invalid URL. Please enter a valid website address.';
        }
        
        res.status(500).json({ error: errorMessage });
        
    } finally {
        // Cleanup
        if (page) {
            await page.close().catch(console.error);
        }
        
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
            } catch (err) {
                console.error('Error deleting temp file:', err);
            }
        }
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
        }
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
async function startServer() {
    try {
        // Test browser launch on startup
        console.log('Launching browser for initial test...');
        const testBrowser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        await testBrowser.close();
        console.log('Browser test successful');
        
        app.listen(PORT, () => {
            console.log(`HTML to PDF converter running on port ${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    if (browser) {
        await browser.close();
    }
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;