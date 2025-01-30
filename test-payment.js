require('dotenv').config();
const database = require('./src/services/mongoDatabase');
const mongoose = require('mongoose');

async function testPayments() {
    try {
        console.log('Testing MongoDB connection and payment functionality...');

        // Get a report ID to use for testing
        // Wait for MongoDB connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get reports with guild ID from test data
        const reports = await database.getReports('987654321');
        console.log('\nFound reports:', reports.length);
        
        if (reports.length === 0) {
            console.log('No reports found to test with');
            return;
        }

        console.log('\nFirst report:', {
            id: reports[0]._id,
            target: reports[0].targetHandle,
            guildId: reports[0].guildId,
            crew: reports[0].crew
        });

        const testReport = reports[0];
        const testPayment = {
            hitId: testReport._id,
            payerId: '123456789',
            receiverId: '987654321',
            amount: 1000000
        };

        // Add test payment
        console.log('\nAdding test payment...');
        const paymentId = await database.addPayment(testPayment);
        console.log('Payment added with ID:', paymentId);

        // Check balance
        console.log('\nChecking balance for receiver...');
        const balance = await database.getUserBalance(testPayment.receiverId, testReport.guildId);
        console.log('Balance:', {
            total_share: balance.total_share.toLocaleString(),
            total_received: balance.total_received.toLocaleString(),
            remaining: (balance.total_share - balance.total_received).toLocaleString()
        });

    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testPayments();
