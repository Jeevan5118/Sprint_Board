const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const { Client } = require('pg');

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
    try {
        console.log('--- STARTING API VERIFICATION ---');

        // 1. Login
        console.log('Logging in as admin@sprintboard.com...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@sprintboard.com',
            password: 'Admin@123'
        });
        const token = loginRes.data.token;
        console.log('Login successful.');

        // 2. Prepare CSV (using space-separated headers to test the new robust normalization)
        const csvPath = 'c:\\Users\\Jeevan Konduru\\OneDrive\\Desktop\\youtube\\Sprint Board\\test_import_api.csv';
        const csvContent = 'Employee Name, Mail , Password , TEAM , Project , Sprint , Task Title , Task Description , Task Priority\n' +
                           'API Test User 3,api.test.3@test.com,Password@123,API Robustness Team 2,API Project,Sprint 1,API Robust Task 2,Description,High';
        fs.writeFileSync(csvPath, csvContent);

        // 3. Upload
        console.log('Uploading CSV...');
        const form = new FormData();
        form.append('file', fs.createReadStream(csvPath));
        form.append('import_type', 'automate');

        const uploadRes = await axios.post(`${BASE_URL}/admin/import/csv`, form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Upload Result:', JSON.stringify(uploadRes.data, null, 2));

        // 4. Verify DB
        console.log('Verifying Database...');
        const client = new Client({
            user: 'postgres',
            password: 'konduru2002',
            host: 'localhost',
            database: 'sprint_board',
            port: 5432
        });
        await client.connect();
        
        const teamCheck = await client.query("SELECT id FROM teams WHERE name = 'API Robustness Team 2'");
        console.log('Team Created:', teamCheck.rows.length > 0);
        
        if (teamCheck.rows.length > 0) {
            const teamId = teamCheck.rows[0].id;
            const tasks = await client.query("SELECT title FROM tasks WHERE team_id = $1", [teamId]);
            console.log('Tasks for Team:', tasks.rows.map(r => r.title));
            
            const members = await client.query(`
                SELECT u.email FROM team_members tm 
                JOIN users u ON tm.user_id = u.id 
                WHERE tm.team_id = $1
            `, [teamId]);
            console.log('Members for Team:', members.rows.map(r => r.email));
            
            const userCheck = await client.query("SELECT id FROM users WHERE email = 'api.test.3@test.com'");
            console.log('User Account exists:', userCheck.rows.length > 0);
        }

        await client.end();
        console.log('--- API VERIFICATION COMPLETE ---');

    } catch (err) {
        console.error('Test failed:', err.response?.data || err.message);
    }
}

test();
