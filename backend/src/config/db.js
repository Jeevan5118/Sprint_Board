import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    user: !process.env.DATABASE_URL ? (process.env.DB_USER || 'postgres') : undefined,
    password: !process.env.DATABASE_URL ? (process.env.DB_PASSWORD || 'postgres') : undefined,
    host: !process.env.DATABASE_URL ? (process.env.DB_HOST || 'localhost') : undefined,
    port: !process.env.DATABASE_URL ? (process.env.DB_PORT || 5432) : undefined,
    database: !process.env.DATABASE_URL ? (process.env.DB_NAME || 'sprint_board') : undefined,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
});

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
