import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    }
    : {
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'sprint_board',
        ssl: isProduction ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

// Test connection
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text, params) => {
    return pool.query(text, params).catch(err => {
        console.error('[DB Error]:', err.message);
        throw err;
    });
};
export default pool;
