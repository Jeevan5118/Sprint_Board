import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

if (connectionString) {
    const maskedUrl = connectionString.split('@')[1] || "Hidden";
    console.log(`📡 Database Target: ${maskedUrl}`);
}

const poolConfig = connectionString
    ? {
        connectionString,
        ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
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
