import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDB() {
    const credentials = {
        user: 'postgres',
        password: 'konduru2002',
        host: 'localhost',
        port: 5432,
    };

    const client = new Client({ ...credentials, database: 'postgres' });

    try {
        await client.connect();
        console.log('Connected to target PostgreSQL engine...');

        const res = await client.query("SELECT datname FROM pg_catalog.pg_database WHERE datname = 'sprint_board'");
        if (res.rowCount === 0) {
            console.log('Database non-existent. Creating sprint_board...');
            await client.query('CREATE DATABASE sprint_board');
        } else {
            console.log('Database sprint_board already exists. Continuing...');
        }
    } catch (err) {
        console.error('Initial connection failed. Is PostgreSQL running locally?', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    console.log('Applying sprint_board schema...');
    const boardClient = new Client({ ...credentials, database: 'sprint_board' });

    try {
        await boardClient.connect();
        const sql = fs.readFileSync(path.join(__dirname, '../database.sql'), 'utf-8');
        await boardClient.query(sql);
        console.log('Success! Schema applied.');
    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await boardClient.end();
    }
}

initDB();
