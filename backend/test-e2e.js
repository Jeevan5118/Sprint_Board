import axios from 'axios';

const API_URL = 'http://localhost:5000/api/v1';

async function runE2ETests() {
    let adminToken, leadToken, memberToken;
    let leadId, memberId, teamId, projectId, sprintId, taskId;

    console.log('--- STARTING E2E QA TESTS ---');

    try {
        // 1. Admin Login
        console.log('\\n[1] Admin Login...');
        const adminRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@sprintboard.com',
            password: 'konduru2002'
        });
        adminToken = adminRes.data.token;
        console.log('✅ Admin login successful');

        const adminHeader = { headers: { Authorization: `Bearer ${adminToken}` } };

        // 2. Admin Creates Users (Team Lead & Member)
        console.log('\\n[2] Admin Creating Users...');
        const leadRes = await axios.post(`${API_URL}/admin/users`, {
            name: 'QA Team Lead',
            email: `qa.lead.${Date.now()}@test.com`,
            password: 'password123',
            role: 'Team Lead'
        }, adminHeader);
        leadId = leadRes.data.data.id;
        console.log('✅ Team Lead created');

        const memberRes = await axios.post(`${API_URL}/admin/users`, {
            name: 'QA Member',
            email: `qa.member.${Date.now()}@test.com`,
            password: 'password123',
            role: 'Member'
        }, adminHeader);
        memberId = memberRes.data.data.id;
        console.log('✅ Member created');

        // 3. Admin Creates Team & Adds Members
        console.log('\\n[3] Admin Creating Team and Adding Members...');
        const teamRes = await axios.post(`${API_URL}/teams`, {
            name: 'QA Alpha Team',
            description: 'Team for automated QA testing',
            members: [leadId, memberId]
        }, adminHeader);
        teamId = teamRes.data.id;
        console.log('✅ Team created with members');

        // 4. Team Lead Login
        console.log('\\n[4] Team Lead Login...');
        const leadLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: leadRes.data.data.email,
            password: 'password123'
        });
        leadToken = leadLoginRes.data.token;
        const leadHeader = { headers: { Authorization: `Bearer ${leadToken}` } };
        console.log('✅ Team Lead login successful');

        // 5. Team Lead Creates Project
        console.log('\\n[5] Team Lead Creating Project...');
        const projectRes = await axios.post(`${API_URL}/teams/${teamId}/projects`, {
            name: 'QA Automation Project',
            description: 'Project for E2E tests',
            team_id: teamId
        }, leadHeader);
        projectId = projectRes.data.id;
        console.log('✅ Project created');

        // 6. Team Lead Creates Sprint
        console.log('\\n[6] Team Lead Creating Sprint...');
        const sprintRes = await axios.post(`${API_URL}/teams/${teamId}/sprints`, {
            name: 'QA Sprint 1',
            start_date: new Date().toISOString(),
            end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }, leadHeader);
        sprintId = sprintRes.data.id;
        console.log('✅ Sprint created');

        // Start Sprint
        await axios.put(`${API_URL}/teams/${teamId}/sprints/${sprintId}/start`, {}, leadHeader);
        console.log('✅ Sprint started');

        // 7. Team Lead Creates Task
        console.log('\\n[7] Team Lead Creating Task...');
        const taskRes = await axios.post(`${API_URL}/teams/${teamId}/tasks`, {
            title: 'Implement E2E Tests',
            description: 'Write test scripts',
            priority: 'High',
            type: 'Task',
            story_points: 5,
            assignee_id: memberId,
            project_id: projectId,
            sprint_id: sprintId
        }, leadHeader);
        taskId = taskRes.data.id;
        console.log('✅ Task created and assigned');

        // 8. Member Login
        console.log('\\n[8] Member Login...');
        const memberLoginRes = await axios.post(`${API_URL}/auth/login`, {
            email: memberRes.data.data.email,
            password: 'password123'
        });
        memberToken = memberLoginRes.data.token;
        const memberHeader = { headers: { Authorization: `Bearer ${memberToken}` } };
        console.log('✅ Member login successful');

        // 9. Member RBAC Checks (Should Fail)
        console.log('\\n[9] Testing Member RBAC Constraints...');
        try {
            await axios.post(`${API_URL}/teams/${teamId}/sprints`, {
                name: 'Unauthorized Sprint'
            }, memberHeader);
            console.error('❌ RBAC FAIL: Member created a sprint!');
        } catch (err) {
            if (err.response.status === 403) {
                 console.log('✅ RBAC PASS: Member correctly blocked from creating sprint');
            } else {
                 console.log('⚠️ Unexpected error code: ', err.response.status);
            }
        }

        try {
            await axios.post(`${API_URL}/teams/${teamId}/tasks`, {
                title: 'Unauthorized Task'
            }, memberHeader);
            console.error('❌ RBAC FAIL: Member created a task!');
        } catch (err) {
            if (err.response.status === 403) {
                 console.log('✅ RBAC PASS: Member correctly blocked from creating task');
            } else {
                 console.log('⚠️ Unexpected error code: ', err.response.status);
            }
        }

        // 10. Member Updates Task Status
        console.log('\n[10] Member Updating Task Status...');
        await axios.put(`${API_URL}/teams/${teamId}/tasks/${taskId}/status`, {
            status: 'In Progress',
            sort_order: 1000
        }, memberHeader);
        console.log('✅ Task status updated to In Progress');

        console.log('\n🎉 ALL E2E TESTS PASSED SUCCESSFULLY 🎉');

    } catch (error) {
        console.error('\\n💥 TEST FAILED:');
        console.error(error.response ? (error.response.data.message || error.response.data) : error.message);
    }
}

runE2ETests();
