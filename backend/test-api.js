import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
    try {
        console.log('Testing Login...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            email: 'admin@sprintboard.com',
            password: 'konduru2002'
        });
        const token = loginRes.data.token;
        console.log('Login Success! Token obtained.');

        console.log('Testing GET /teams...');
        const teamsRes = await axios.get(`${BASE_URL}/teams`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`Success! Found ${teamsRes.data.length} teams.`);

        console.log('Testing GET /dashboard/analytics...');
        const dashRes = await axios.get(`${BASE_URL}/dashboard/analytics`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Dashboard Success!');
        console.log(JSON.stringify(dashRes.data, null, 2));

    } catch (err) {
        console.error('API Error:');
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error('Data:', err.response.data);
        } else {
            console.error(err.message);
        }
    }
}

test();
