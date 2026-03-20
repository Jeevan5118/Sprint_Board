import pg from 'pg';
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

async function restoreEmails() {
    const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log('--- STARTING EMAIL RESTORATION ---');

        const mappings = {
            'godavari.dk@sprintboard.com': 'godavari.dk@aksharaenterprises.info',
            'malvika.b.s@sprintboard.com': 'bsmalvika27@gmail.com',
            'shoaib@sprintboard.com': 'shoaibrrr9@gmail.com',
            'harris@sprintboard.com': 'syed.harris@aksharaenterprises.info',
            'konduru.jeevan@sprintboard.com': 'jeevankonduru2002@gmail.com',
            'madhumati.angadi@sprintboard.com': 'madhumati3006@gmail.com',
            'shreyas.s@sprintboard.com': 'shreyas.s@aksharaenterprises.info',
            'pranav.n@sprintboard.com': 'post2pranavn@gmail.com',
            'abhinitha.hr@sprintboard.com': 'abhinithahr@gmail.com',
            'elvin@sprintboard.com': 'elvin.prince@aksharaenterprises.info',
            'nandyala.jishnu@sprintboard.com': 'jishnunreddy@gmail.com',
            'ananth.charan@sprintboard.com': 'ananth.charan@aksharaenterprises.info',
            'shilpashree@sprintboard.com': 'shilpak2k23@gmail.com',
            'vedanth@sprintboard.com': 'vedanth.parmesh70@gmail.com'
        };

        for (const [synthetic, real] of Object.entries(mappings)) {
            const res = await client.query("UPDATE users SET email = $1 WHERE email = $2 RETURNING id, name", [real, synthetic]);
            if (res.rowCount > 0) {
                console.log(`✅ Restored: ${res.rows[0].name} (${real})`);
            } else {
                console.log(`ℹ️ User ${synthetic} not found or already restored.`);
            }
        }

        console.log('\n--- EMAIL RESTORATION COMPLETE ---');

    } catch (err) {
        console.error('Restoration failed:', err);
    } finally {
        await client.end();
    }
}

restoreEmails();
