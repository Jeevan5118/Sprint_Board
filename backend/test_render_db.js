import pkg from 'pg';
const { Client } = pkg;

const renderUrl = 'postgresql://sprint_board_user:Stg5mvXbO2v5jlyWLJdMnvAo2B2yMqyB@dpg-d6ujaup4tr6s738v7aag-a.oregon-postgres.render.com/sprint_board';

async function testConnection() {
    console.log('Testing connection to Render database...');
    const client = new Client({
        connectionString: renderUrl,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('✅ Connected to Render successfully!');

        const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
        console.log('Public tables:', res.rows.map(r => r.tablename).join(', '));

        await client.end();
    } catch (err) {
        console.error('❌ Failed to connect to Render:', err.message);
        process.exit(1);
    }
}

testConnection();
