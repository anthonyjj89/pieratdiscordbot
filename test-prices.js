const tradeScraper = require('./src/services/tradeScraper');

async function testPrices() {
    try {
        const prices = await tradeScraper.getPrices('fluorine');
        
        console.log('\n=== Best Location ===');
        const best = prices.bestLocation;
        console.log(`Location: ${best.isNoQuestions ? '👁️ ' : ''}${best.name}`);
        console.log(`Region: ${best.orbit}, ${best.system}`);
        console.log(`Price: ${tradeScraper.formatPrice(best.price.current)} aUEC/unit`);
        console.log(`Inventory: ${best.inventory.current} SCU`);
        console.log(`Container Sizes: ${best.containerSizes.join(', ')} SCU`);
        if (best.faction) console.log(`Faction: ${best.faction}`);

        console.log('\n=== Other Top Locations ===');
        prices.allLocations
            .slice(1, 4)
            .forEach(loc => {
                console.log(`${loc.isNoQuestions ? '👁️ ' : ''}${loc.name}`);
                console.log(`  Region: ${loc.orbit}`);
                console.log(`  Price: ${tradeScraper.formatPrice(loc.price.current)} aUEC/unit`);
                console.log('');
            });

        console.log('=== Price Statistics ===');
        const allPrices = prices.allLocations.map(loc => loc.price.current);
        console.log(`Average: ${tradeScraper.formatPrice(prices.averagePrice)} aUEC/unit`);
        console.log(`Range: ${tradeScraper.formatPrice(Math.min(...allPrices))} - ${tradeScraper.formatPrice(Math.max(...allPrices))} aUEC/unit`);

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPrices();
