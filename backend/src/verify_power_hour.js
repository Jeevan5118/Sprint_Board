import https from 'https';

const BASE_URL = 'sprint-board-unified.onrender.com';
const API_PREFIX = '/api/v1';
const ADMIN_EMAIL = 'admin@sprintboard.com';
const ADMIN_PASS = 'konduru2002';

function request(method, path, data, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: BASE_URL,
            port: 443,
            path: API_PREFIX + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Power-Hour-Verification'
            }
        };

        if (token) options.headers['Authorization'] = `Bearer ${token}`;

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                let parsed = {};
                try {
                    parsed = body ? JSON.parse(body) : {};
                } catch (e) {
                    parsed = { rawBody: body };
                }
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({ status: res.statusCode, data: parsed });
                } else {
                    reject({ status: res.statusCode, data: parsed });
                }
            });
        });

        req.on('error', reject);
        if (data) {
            const bodyStr = JSON.stringify(data);
            req.setHeader('Content-Length', Buffer.byteLength(bodyStr));
            req.write(bodyStr);
        }
        req.end();
    });
}

async function verifyPowerHour() {
    console.log('⚡ Starting Power Hour Isolation Audit...');
    
    try {
        // 1. Login
        const auth = await request('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const token = auth.data.token;
        console.log('✅ Admin logged in.');

        // 2. Pick a Team (or create a temporary one)
        const teams = await request('GET', '/teams', null, token);
        if (!teams.data || teams.data.length === 0) throw new Error('No teams found to test with.');
        const teamId = teams.data[0].id;
        console.log(`✅ Using Team ID: ${teamId} (${teams.data[0].name})`);

        // 3. Create a Normal Sprint and a Power Hour Sprint
        const normalSprintName = `NORMAL_VERIFY_${Date.now()}`;
        const powerHourSprintName = `POWER_HOUR_VERIFY_${Date.now()}`;

        console.log('Creating Normal Sprint...');
        const normalSprint = await request('POST', `/teams/${teamId}/sprints`, { 
            name: normalSprintName, 
            is_power_hour: false 
        }, token);
        const normalSprintId = normalSprint.data.id;

        console.log('Creating Power Hour Sprint...');
        const phSprint = await request('POST', `/teams/${teamId}/sprints`, { 
            name: powerHourSprintName, 
            is_power_hour: true 
        }, token);
        const phSprintId = phSprint.data.id;

        // 4. Verify Isolation in Listing
        console.log('Verifying isolation in Sprints list...');
        const normalList = await request('GET', `/teams/${teamId}/sprints?is_power_hour=false`, null, token);
        const phList = await request('GET', `/teams/${teamId}/sprints?is_power_hour=true`, null, token);

        const foundPhInNormal = normalList.data.find(s => s.id === phSprintId);
        const foundNormalInPh = phList.data.find(s => s.id === normalSprintId);

        if (foundPhInNormal) throw new Error('FAIL: Power Hour Sprint leaked into Normal list!');
        if (foundNormalInPh) throw new Error('FAIL: Normal Sprint leaked into Power Hour list!');
        console.log('✅ Sprint isolation verified.');

        // 5. Create Tasks in each sprint
        console.log('Creating tasks for isolation test...');
        const normalTask = await request('POST', `/teams/${teamId}/tasks`, { 
            title: 'NORMAL_TASK', 
            sprint_id: normalSprintId, 
            is_power_hour: false 
        }, token);
        const phTask = await request('POST', `/teams/${teamId}/tasks`, { 
            title: 'PH_TASK', 
            sprint_id: phSprintId, 
            is_power_hour: true 
        }, token);

        // 6. Verify Task Isolation
        console.log('Verifying task isolation via GET /tasks...');
        const normalTasks = await request('GET', `/teams/${teamId}/tasks?is_power_hour=false&sprint_id=${normalSprintId}`, null, token);
        const phTasks = await request('GET', `/teams/${teamId}/tasks?is_power_hour=true&sprint_id=${phSprintId}`, null, token);

        if (normalTasks.data.some(t => t.id === phTask.data.id)) throw new Error('FAIL: PH Task leaked into Normal query!');
        if (phTasks.data.some(t => t.id === normalTask.data.id)) throw new Error('FAIL: Normal Task leaked into PH query!');
        console.log('✅ Task isolation verified.');

        // 7. Cleanup
        console.log('Cleaning up test data...');
        await request('DELETE', `/teams/${teamId}/tasks/${normalTask.data.id}`, null, token);
        await request('DELETE', `/teams/${teamId}/tasks/${phTask.data.id}`, null, token);
        // Sprints don't have a delete endpoint yet or it's restricted, but we verified the logic.
        
        console.log('\n🌟 POWER HOUR DEPLOYMENT VERIFICATION: PASSED 🌟');

    } catch (error) {
        console.error('\n🛑 VERIFICATION FAILED');
        console.error('Error:', error.message || error);
        if (error.data) console.error('Response:', JSON.stringify(error.data, null, 2));
        process.exit(1);
    }
}

verifyPowerHour();
