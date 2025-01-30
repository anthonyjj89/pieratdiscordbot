const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const db = new sqlite3.Database(path.join(__dirname, 'data/reports.db'));

// Helper to run queries
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function inspectDatabase() {
    try {
        console.log('\n=== Database Tables ===');
        
        // Check reports
        console.log('\nReports:');
        const reports = await runQuery('SELECT * FROM reports');
        console.log(`Total reports: ${reports.length}`);
        if (reports.length > 0) {
            console.log('\nMost recent reports:');
            reports.slice(-3).forEach(r => {
                console.log(`- Hit #${r.id}: ${r.target_handle} (${r.boxes} boxes of ${r.cargo_type})`);
            });
        }

        // Check user piracy hits
        console.log('\nUser Piracy Hits:');
        const userHits = await runQuery('SELECT * FROM user_piracy_hits');
        console.log(`Total user hits: ${userHits.length}`);
        if (userHits.length > 0) {
            console.log('\nMost recent user hits:');
            userHits.slice(-3).forEach(h => {
                console.log(`- User: ${h.user_id}`);
                console.log(`  Details: ${h.details}`);
                console.log(`  Date: ${h.hit_date}`);
                if (h.org_id) console.log(`  Org: ${h.org_id}`);
                console.log('');
            });
        }

        // Check org piracy hits
        console.log('\nOrg Piracy Hits:');
        const orgHits = await runQuery('SELECT * FROM org_piracy_hits');
        console.log(`Total org hits: ${orgHits.length}`);
        if (orgHits.length > 0) {
            console.log('\nMost recent org hits:');
            orgHits.slice(-3).forEach(h => {
                console.log(`- Org: ${h.org_id}`);
                console.log(`  Member: ${h.member_handle}`);
                console.log(`  Details: ${h.details}`);
                console.log(`  Date: ${h.hit_date}`);
                console.log('');
            });
        }

        // Check crew members
        console.log('\nCrew Members:');
        const crew = await runQuery('SELECT * FROM crew_members');
        console.log(`Total crew entries: ${crew.length}`);
        if (crew.length > 0) {
            console.log('\nMost recent crew entries:');
            crew.slice(-3).forEach(c => {
                console.log(`- Hit #${c.hit_id}: ${c.user_id} (${c.role})`);
                console.log(`  Share: ${c.share}, Ratio: ${c.role_ratio}`);
            });
        }

        // Check for data inconsistencies
        console.log('\n=== Data Consistency Checks ===');

        // Check for reports without crew
        const reportsWithoutCrew = await runQuery(`
            SELECT r.id, r.target_handle 
            FROM reports r 
            LEFT JOIN crew_members cm ON r.id = cm.hit_id 
            WHERE cm.id IS NULL
        `);
        if (reportsWithoutCrew.length > 0) {
            console.log('\nReports without crew members:');
            reportsWithoutCrew.forEach(r => {
                console.log(`- Hit #${r.id}: ${r.target_handle}`);
            });
        }

        // Check for reports without corresponding piracy hits
        const reportsWithoutHits = await runQuery(`
            SELECT r.id, r.target_handle 
            FROM reports r 
            LEFT JOIN user_piracy_hits uph ON r.target_handle = uph.user_id 
            WHERE uph.user_id IS NULL
        `);
        if (reportsWithoutHits.length > 0) {
            console.log('\nReports without piracy hit records:');
            reportsWithoutHits.forEach(r => {
                console.log(`- Hit #${r.id}: ${r.target_handle}`);
            });
        }

    } catch (error) {
        console.error('Error inspecting database:', error);
    } finally {
        db.close();
    }
}

// Run inspection
inspectDatabase();
