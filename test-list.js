const database = require('./src/services/database');
const tradeScraper = require('./src/services/tradeScraper');

async function testList() {
    try {
        // Test with and without guild filter
        console.log('\n=== All Reports (No Guild Filter) ===');
        const allReports = await database.all(`
            SELECT 
                r.*,
                GROUP_CONCAT(DISTINCT cm.user_id || ',' || cm.share || ',' || cm.role || ',' || cm.role_ratio) as crew,
                s.holder_id as storage_holder
            FROM reports r
            LEFT JOIN crew_members cm ON r.id = cm.hit_id
            LEFT JOIN storage s ON r.id = s.hit_id
            GROUP BY r.id
            ORDER BY r.timestamp DESC
        `);
        
        if (allReports.length > 0) {
            allReports.forEach(report => {
                console.log(`\nHit #${report.id}:`);
                console.log(`Target: ${report.target_handle}`);
                console.log(`Guild ID: ${report.guild_id}`);
                console.log(`Cargo: ${report.boxes} boxes of ${report.cargo_type}`);
                console.log(`Location: ${report.sell_location}`);
                console.log(`Price: ${report.current_price} aUEC/unit`);
                console.log(`Status: ${report.status}`);
                
                // Parse crew data
                if (report.crew) {
                    console.log('\nCrew:');
                    const crewData = report.crew.split(',');
                    for (let i = 0; i < crewData.length; i += 4) {
                        console.log(`- User ${crewData[i]}`);
                        console.log(`  Share: ${crewData[i + 1]}`);
                        console.log(`  Role: ${crewData[i + 2]}`);
                        console.log(`  Ratio: ${crewData[i + 3]}`);
                    }
                }
            });
        } else {
            console.log('No reports found');
        }

        // Test piracy hits
        console.log('\n=== Piracy Hits ===');
        const hits = await database.all('SELECT * FROM user_piracy_hits');
        hits.forEach(hit => {
            console.log(`\nUser: ${hit.user_id}`);
            console.log(`Date: ${hit.hit_date}`);
            console.log(`Details: ${hit.details}`);
            if (hit.org_id) console.log(`Org: ${hit.org_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

// Add all() method to database for raw queries
database.all = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

testList();
