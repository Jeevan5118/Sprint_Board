import https from 'https';

const BASE_URL = 'sprintboardsfinal.vercel.app';
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
                'User-Agent': 'Senior-QA-Verification'
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

async function runMemberAudit() {
    console.log('🕵️ Member Visibility Audit Post-Repair: START');
    
    try {
        // 1. Admin Login
        const auth = await request('POST', '/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASS });
        const adminId = auth.data.id;
        const adminToken = auth.data.token;
        console.log('✅ Admin logged in.');

        // 2. Create a Team
        const teamName = `Audit Team ${Math.floor(Math.random() * 10000)}`;
        const team = await request('POST', '/teams', { name: teamName, description: 'Visibility Test' }, adminToken);
        const teamId = team.data.id;
        console.log(`✅ Team created: ${teamName} (${teamId})`);

        // 3. Create a Member User (Mixed Case to test normalization)
        const memberEmail = `MEMBER_REPAIR_${Math.floor(Math.random() * 10000)}@Test.com`;
        const memberPass = 'TestPass123!';
        const newUser = await request('POST', '/admin/users', { 
            name: 'Audit Member', 
            email: memberEmail, 
            password: memberPass, 
            role: 'Member' 
        }, adminToken);
        const memberId = newUser.data.data.id;
        console.log(`✅ Member created (Mixed Case): ${memberEmail} (${memberId})`);

        // 4. Map Member to Team
        await request('POST', `/teams/${teamId}/members`, { 
            user_id: memberId 
        }, adminToken);
        console.log('✅ Member mapped to team.');

        // 5. Create a task assigned to ADMIN in that team
        const taskTitle = 'Team Task - Member should see this';
        await request('POST', `/teams/${teamId}/tasks`, { 
            title: taskTitle, 
            status: 'To Do',
            assignee_id: adminId 
        }, adminToken);
        console.log('✅ Team Task created.');

        // 6. Member Login (Lowercase email to test normalization match)
        const memberAuth = await request('POST', '/auth/login', { email: memberEmail.toLowerCase(), password: memberPass });
        const memberToken = memberAuth.data.token;
        console.log('✅ Member logged in (Lowercase email).');

        // 7. Verify Dashboard Overview
        console.log('Checking Member Dashboard...');
        const dash = await request('GET', '/dashboard/analytics', null, memberToken);
        const dashTeam = dash.data.teams.find(t => t.id === teamId);
        if (dashTeam) {
            console.log(`✅ Member Dashboard: Team "${teamName}" IS visible.`);
        } else {
            throw new Error(`Member Dashboard: Team "${teamName}" is MISSING!`);
        }

        // 8. Verify Team Board Tasks
        console.log('Checking Member Team Board Tasks...');
        const tasks = await request('GET', `/teams/${teamId}/tasks`, null, memberToken);
        if (tasks.data.length > 0) {
            console.log(`✅ Member Board: ${tasks.data.length} tasks visible.`);
        } else {
            throw new Error('Member Board: NO tasks visible!');
        }

        // 9. Cleanup
        await request('DELETE', `/teams/${teamId}`, null, adminToken);
        console.log('✅ Audit Team cleaned up.');

        console.log('\n🌟 FINAL VISIBILITY AUDIT : PASSED 🌟');

    } catch (error) {
        console.error('\n🛑 FINAL VISIBILITY AUDIT : FAILED');
        console.error('Error:', error.message || error);
        if (error.data) console.error('Response:', JSON.stringify(error.data, null, 2));
        process.exit(1);
    }
}

runMemberAudit();
