const database = require('./src/services/database');

async function insertTestData() {
    try {
        console.log('Inserting test data...');

        // Add a test report
        const reportId = await database.addReport({
            targetHandle: 'test_target',
            reporterId: '123456789',
            cargoType: 'GOLD',
            boxes: 100,
            sellLocation: 'CRU-L1',
            currentPrice: 6000,
            notes: 'Test report',
            guildId: '987654321',
            sellerId: '123456789'
        });
        console.log(`Created report #${reportId}`);

        // Add crew members
        await database.addCrewMember({
            hitId: reportId,
            userId: '123456789',
            role: 'pilot',
            share: 0.6
        });

        await database.addCrewMember({
            hitId: reportId,
            userId: '987654321',
            role: 'gunner',
            share: 0.4
        });

        // Add piracy hits
        await database.addPiracyHit(
            'test_target',
            false,
            'Cargo stolen: 100 GOLD'
        );

        await database.addPiracyHit(
            'TEST-ORG',
            true,
            'Member test_target hit: 100 GOLD',
            null,
            'test_target'  // memberHandle parameter
        );

        console.log('Test data inserted successfully');

        // Query and display the data
        console.log('\nVerifying data...');
        const reports = await database.getReports(null);
        console.log('\nReports:', JSON.stringify(reports, null, 2));

        const hits = await database.getPiracyHistory('test_target');
        console.log('\nPiracy History:', JSON.stringify(hits, null, 2));

    } catch (error) {
        console.error('Error:', error);
    }
}

insertTestData();
