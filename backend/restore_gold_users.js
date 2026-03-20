import pkg from 'pg';
const { Pool } = pkg;
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const users = [
    { name: "Abhilash Rai", email: "abhilash.rai@aksharaenterprises.info", password: "Abhilashrai@123" },
    { name: "Ananth Charan", email: "ananth.charan@aksharaenterprises.info", password: "Ananthcharan@123" },
    { name: "Chandan K", email: "chandan.k@aksharaenterprises.info", password: "Chandan@123" },
    { name: "Godavari DK", email: "godavari.dk@aksharaenterprises.info", password: "Godavari@123" },
    { name: "Hemanth Kumar GL", email: "gl.hemanth@gmail.com", password: "Hemanth@123" },
    { name: "J Vaishnav Rahul", email: "jvaishnav.rahul@aksharaenterprises.info", password: "Vaishnav@123" },
    { name: "Keshav Navneet Bhattad", email: "keshav.bhattad@aksharaenterprises.info", password: "Keshav@123" },
    { name: "Madhumati Angadi", email: "madhumati3006@gmail.com", password: "Madhu@123" },
    { name: "Nithin R", email: "nithinrajashekar644@gmail.com", password: "Nithin@123" },
    { name: "Ranjith Kumar N", email: "ranjith.kumar@aksharaenterprises.info", password: "Ranjith@123" },
    { name: "Shreyas S", email: "shreyas.s@aksharaenterprises.info", password: "Shreyas@123" },
    { name: "Ujwal R", email: "ujwal.ravikumar@aksharaenterprises.info", password: "Ujwal@123" },
    { name: "Yashas V", email: "yashas.v@aksharaenterprises.info", password: "Yashas@123" },
    { name: "Yuvan Melwin MJ", email: "yuvan.melwinmj@aksharaenterprises.info", password: "Yuvan@123" },
    { name: "Rithvik R", email: "RITHVIKN23@GMAIL.COM", password: "Rithvik@123" },
    { name: "Jeffery Sam", email: "jefferysam99@gmail.com", password: "Jeff@123" },
    { name: "Benjamin", email: "benjamin.arakkal@aksharaenterprise.info", password: "Benji@123" },
    { name: "Pranav N", email: "post2pranavn@gmail.com", password: "Pranav@123" },
    { name: "Harris", email: "syed.harris@aksharaenterprises.info", password: "Harris@123" },
    { name: "Tarun", email: "tarunsuresh@aksharaenterprises.info", password: "Tarun@123" },
    { name: "Vinay Shetty", email: "vinay.shetty@aksharaenterprises.info", password: "Vinay@123" },
    { name: "Elvin", email: "elvin.prince@aksharaenterprises.info", password: "Elvin@123" },
    { name: "Khushi Nahar", email: "Khushin2006@gmail.com", password: "Khushi@123" },
    { name: "Deepthi", email: "deepthibiju04@gmail.com", password: "Deepthi@123" },
    { name: "Vishnu Menon", email: "vishnumenon851@gmail.com", password: "Vishnu@123" },
    { name: "Rahul Hemanth", email: "18rahul.hemanth@gmail.com", password: "Rahul@123" },
    { name: "Chirag Sharma", email: "itschiragg2006@gmail.com", password: "Chirag@123" },
    { name: "Chandni", email: "chandnib603@gmail.com", password: "Chandini@123" },
    { name: "Siddhi Kotharkar", email: "siddhikotharkar@gmail.com", password: "Siddhi2123" },
    { name: "Suhas Krishna", email: "suhaskrishna749@gmail.com", password: "Suhas@123" },
    { name: "Nitin M", email: "nithinmanjunath2020@gmail.com", password: "Nitin@123" },
    { name: "Malvika B S", email: "bsmalvika27@gmail.com", password: "Malvika@123" },
    { name: "Vedanth", email: "vedanth.parmesh70@gmail.com", password: "Vedanth@123" },
    { name: "Praneel", email: "Praneelsingh42@gmail.com", password: "Praneel@123" },
    { name: "Sushma raj", email: "sushma.raj.1935@gmail.com", password: "Sushma@123" },
    { name: "Tanvi Vishwanath", email: "tanvitvh@gmail.com", password: "Tanvi@123" },
    { name: "Avish Krishna", email: "avishkrishna77@gmail.com", password: "Avish@123" },
    { name: "Nihar", email: "niharsaldanha@gmail.com", password: "Nihar@123" },
    { name: "Dominic", email: "dominicniranjan12@gmail.com", password: "Dominic@123" },
    { name: "Mahin Manoj", email: "mahinmanoj48@gmail.com", password: "Mahin@123" },
    { name: "Vasudha", email: "vasudhanagesh.16@gmail.com", password: "Vasudha@123" },
    { name: "Shoaib", email: "shoaibrrr9@gmail.com", password: "Shoaib@123" },
    { name: "Prakruthi", email: "prakruthiggowda09@gmail.com", password: "Prakruthu@123" },
    { name: "Manya Umesh", email: "manyaumesh05@gmail.com", password: "Manyaumesh@123" },
    { name: "Chaya Kiran S", email: "chayakirans@gmail.com", password: "Chaya@123" },
    { name: "Nandyala Jishnu", email: "jishnureddy@gmail.com", password: "Jishnu@123" },
    { name: "Konduru Jeevan", email: "jeevankonduru2002@gmail.com", password: "Jeevan@123" },
    { name: "Shikar Srivastav", email: "shikhar5775@gmail.com", password: "Shikar@123" },
    { name: "Akash Mudlpura", email: "akashmudlapur4906@gmail.com", password: "Akash@123" },
    { name: "Sahebgoud N Biradar", email: "sahebgoudbiradar0@gmail.com", password: "Sahebgoud@123" },
    { name: "BK Pramukh", email: "bkpramukh11@gmail.com", password: "pramukhakshara" },
    { name: "Abhinitha HR", email: "abhinithahr@gmail.com", password: "Abhinitha@123" },
    { name: "Shubhanga V", email: "Shubhanga03@gmail.com", password: "Shubhanga@123" },
    { name: "Lisha Chowdhary", email: "lishachowdary338@gmail.com", password: "Lisha@123" },
    { name: "K Yogesh", email: "kyogeshyogesh42@gmail.com", password: "Yogesh@123" },
    { name: "Shilpashree", email: "shilpak2k23@gmail.com", password: "Shilpa@123" },
    { name: "Suryakiran", email: "suryas.sec.official@gmail.com", password: "Surya@123" }
];

async function restore() {
    console.log(`🚀 Starting restoration of ${users.length} users...`);
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
        try {
            const hash = bcrypt.hashSync(user.password, 10);

            // Try to find by name or email (some names/emails might have shifted slightly)
            // But Email is usually the unique key in most apps. 
            // We'll update the password and name where email matches.
            const result = await pool.query(
                "UPDATE users SET name = $1, password_hash = $2 WHERE email = $3 RETURNING id",
                [user.name, hash, user.email]
            );

            if (result.rows.length > 0) {
                updatedCount++;
                console.log(`✅ Restored: ${user.email}`);
            } else {
                // If email doesn't match, maybe the name matches? 
                const resultByName = await pool.query(
                    "UPDATE users SET email = $1, password_hash = $2 WHERE name = $3 RETURNING id",
                    [user.email, hash, user.name]
                );

                if (resultByName.rows.length > 0) {
                    updatedCount++;
                    console.log(`✅ Restored by Name (Email was wrong): ${user.name} -> ${user.email}`);
                } else {
                    // Create if not exists? User said "database contains exact", implying they should be there.
                    // But if they aren't, we should add them.
                    await pool.query(
                        "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'Member')",
                        [user.name, user.email, hash]
                    );
                    updatedCount++;
                    console.log(`➕ Created missing user: ${user.email}`);
                }
            }
        } catch (err) {
            console.error(`❌ Error restoring ${user.email}:`, err.message);
            errorCount++;
        }
    }

    console.log(`\n🎉 Restoration Complete!`);
    console.log(`Success: ${updatedCount}`);
    console.log(`Failed: ${errorCount}`);
}

restore().finally(() => pool.end());
