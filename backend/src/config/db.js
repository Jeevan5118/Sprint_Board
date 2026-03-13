import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

// Log status for Vercel dashboard troubleshooting
if (isProduction) {
    console.log('🌐 Vercel Production Environment Detected');
    console.log('📁 DATABASE_URL Present:', !!process.env.DATABASE_URL);
}

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : false
    }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sprint_board',
        ssl: false,
    };

let pool;
try {
    pool = new Pool(poolConfig);
} catch (err) {
    console.error('🔥 CRITICAL: Failed to initialize Postgres Pool:', err.message);
}

// Test connection
if (pool) {
    pool.on('error', (err) => {
        console.error('❌ Unexpected error on idle client:', err.message);
    });
}

export const query = (text, params) => {
    if (!pool) {
        throw new Error('Database pool not initialized');
    }
    return pool.query(text, params).catch(err => {
        console.error('[DB Query Error]:', err.message);
        throw err;
    });
};

export default pool;
