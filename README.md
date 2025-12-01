# aservus-html-to-pdf
# 🛡️ Aservus HTML to PDF Converter - Backend

![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?style=for-the-badge&logo=railway)
![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?style=for-the-badge&logo=nodedotjs)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

A high-performance, commercial-grade HTML to PDF conversion backend for [Aservus](https://www.aservus.com/). This server handles converting webpages and HTML files to PDF documents.

## ✨ Features

- **🌐 URL to PDF**: Convert any public webpage to PDF
- **📁 HTML File Upload**: Upload `.html` files for conversion
- **⚙️ Custom Settings**: Adjust page size, orientation, margins
- **🔒 100% Free**: No watermarks, no limits, no registration
- **🚀 High Performance**: Optimized for Railway deployment
- **📱 Mobile Friendly**: Responsive design support

## 🚀 Live Deployment

**Production URL:** `https://aservus-html-to-pdf-production.up.railway.app`

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check endpoint |
| `/test` | GET | Test endpoint with API info |
| `/api/convert` | POST | Main conversion endpoint |

## 📦 Project Structure

# aservus-html-to-pdf/
├── server.js # Main Express server (8080 lines)
├── package.json # Dependencies and scripts
└── README.md # This file


## 🔧 Quick Setup

### Files Required (Only 2 files needed!)

1. **`server.js`** - Main Express server
2. **`package.json`** - Dependencies and configuration

### Railway Deployment (Automatic)

1. **Push to GitHub** - Railway auto-deploys on commit
2. **No configuration needed** - Railway detects Node.js app
3. **Auto-scaling** - Railway handles everything

## 📄 API Documentation

### Health Check
```http
GET /health
