const tradeScraper = require('./src/services/tradeScraper');

async function testCommodityLookup(searchTerm) {
    try {
        console.log(`\nSearching for: ${searchTerm}`);
        const commodities = await tradeScraper.getCommodities();
        
        // Try exact matches first
        let commodity = commodities.find(c => 
            c.code === searchTerm || 
            c.name.toUpperCase() === searchTerm
        );

        // If no exact match, try partial matches
        if (!commodity) {
            commodity = commodities.find(c => 
                c.code.includes(searchTerm) || 
                c.name.toUpperCase().includes(searchTerm) ||
                searchTerm.includes(c.code) ||
                searchTerm.includes(c.name.toUpperCase())
            );
        }

        if (commodity) {
            console.log('Found commodity:', {
                name: commodity.name,
                code: commodity.code,
                value: commodity.value,
                avgPrice: commodity.avgPrice,
                uexUrl: `https://uexcorp.space/commodities/info/name/${commodity.value}`
            });

            // Get prices
            console.log('\nFetching prices...');
            const prices = await tradeScraper.getPrices(commodity.value);
            
            if (prices.bestLocation) {
                const best = prices.bestLocation;
                console.log('\nBest Location:');
                console.log(`${best.name} (${best.orbit}, ${best.system})`);
                console.log(`Price: ${tradeScraper.formatPrice(best.price.current)} aUEC/unit`);
                console.log(`Inventory: ${best.inventory.current} SCU`);
            }
        } else {
            console.log('Could not find commodity');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Test various commodities including N/A ones
async function runTests() {
    // Test regular commodities
    await testCommodityLookup('WASTE');
    await testCommodityLookup('SCRAP');
    
    // Test N/A commodities
    await testCommodityLookup('ACCO');
    await testCommodityLookup('DILU');
    
    // Test partial matches
    await testCommodityLookup('GOLD');
    await testCommodityLookup('FLUO');
}

runTests();
