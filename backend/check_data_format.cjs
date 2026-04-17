const { Client } = require('pg');
const client = new Client({
    connectionString: 'postgresql://sprint_board_user:Stg5mvXbO2v5jlyWLJdMnvAo2B2yMqyB@dpg-d6ujaup4tr6s738v7aag-a.oregon-postgres.render.com/sprint_board',
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        console.log('--- task_attachments schema ---');
        const schema = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'task_attachments'");
        console.log(JSON.stringify(schema.rows, null, 2));

        console.log('\n--- Sample attachment data (first 5) ---');
        const data = await client.query("SELECT id, file_name, mimetype, LEFT(file_data::text, 20) as data_prefix FROM task_attachments LIMIT 5");
        console.log(JSON.stringify(data.rows, null, 2));

        console.log('\n--- Sample user_uploads data (first 5) ---');
        const uploads = await client.query("SELECT id, file_name, file_type, mimetype, LEFT(file_data::text, 20) as data_prefix FROM user_uploads LIMIT 5");
        console.log(JSON.stringify(uploads.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

check();
