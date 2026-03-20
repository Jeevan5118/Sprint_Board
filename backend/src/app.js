import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/v1', routes);

// Serve static files from the React app
const frontendPath = path.resolve(__dirname, '../../frontend/dist');
console.log(`🚀 Serving Frontend from: ${frontendPath}`);

if (fs.existsSync(frontendPath)) {
    app.use(express.static(frontendPath));
    console.log("✅ Static file serving enabled.");

    // The "catch-all" handler: for any request that doesn't
    // match one above, send back React's index.html file.
    app.get('/:path*', (req, res) => {
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            res.status(404).json({ error: 'Frontend index.html NOT FOUND. Please ensure build passed.' });
        }
    });
} else {
    console.log("⚠️ WARNING: frontend/dist NOT FOUND. Unified serving disabled.");
    app.get('/:path*', (req, res) => {
        res.status(200).json({ message: 'Backend is running. Unified Frontend NOT FOUND. Check build logs.' });
    });
}

// Global Error Handler
app.use(errorHandler);

export default app;
