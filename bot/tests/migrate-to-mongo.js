require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const mongoDatabase = require('./src/services/mongoDatabase');

// Connect to SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'data/reports.db'));

// Helper to run SQLite queries
const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

async function migrateData() {
    try {
        console.log('Starting migration...');

        // Get all reports with their crew members
        const reports = await runQuery(`
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

        console.log(`Found ${reports.length} reports to migrate`);

        // Migrate each report and its related data
        for (const report of reports) {
            console.log(`\nMigrating report #${report.id} for ${report.target_handle}...`);

            // Add report
            const reportId = await mongoDatabase.addReport({
                targetHandle: report.target_handle,
                reporterId: report.reporter_id,
                cargoType: report.cargo_type,
                boxes: report.boxes,
                sellLocation: report.sell_location,
                currentPrice: report.current_price,
                notes: report.notes,
                timestamp: new Date(report.timestamp),
                guildId: report.guild_id,
                status: report.status,
                sellerId: report.seller_id
            });

            // Add crew members
            if (report.crew) {
                const crewData = report.crew.split(',');
                for (let i = 0; i < crewData.length; i += 4) {
                    await mongoDatabase.addCrewMember({
                        hitId: reportId,
                        userId: crewData[i],
                        role: crewData[i + 2],
                        share: parseFloat(crewData[i + 1])
                    });
                }
            }

            // Add storage if exists
            if (report.storage_holder) {
                await mongoDatabase.setStorage({
                    hitId: reportId,
                    holderId: report.storage_holder
                });
            }
        }

        // Migrate piracy hits
        console.log('\nMigrating user piracy hits...');
        const userHits = await runQuery('SELECT * FROM user_piracy_hits');
        for (const hit of userHits) {
            await mongoDatabase.addPiracyHit(
                hit.user_id,
                false,
                hit.details,
                hit.org_id,
                null
            );
        }

        console.log('\nMigrating org piracy hits...');
        const orgHits = await runQuery('SELECT * FROM org_piracy_hits');
        for (const hit of orgHits) {
            await mongoDatabase.addPiracyHit(
                hit.org_id,
                true,
                hit.details,
                null,
                hit.member_handle
            );
        }

        console.log('\nMigration completed successfully!');

    } catch (error) {
        console.error('Migration error:', error);
    } finally {
        db.close();
        process.exit(0);
    }
}

// Run migration
migrateData();
