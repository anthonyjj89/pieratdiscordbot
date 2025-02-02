const tradeScraper = require('./src/services/tradeScraper');

// Mock interaction object
const createMockInteraction = (searchTerm) => ({
    options: {
        getFocused: () => searchTerm
    }
});

// Test function to simulate autocomplete
async function testAutocomplete(searchTerm) {
    console.log(`\nTesting autocomplete for: "${searchTerm}"`);
    
    try {
        const interaction = createMockInteraction(searchTerm);
        const commodities = await tradeScraper.getCommodities();

        // If no input, return first 25 commodities
        if (!searchTerm) {
            const choices = commodities.slice(0, 25).map(c => {
                const fullName = c.value.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                return {
                    name: `${c.code} - ${fullName}`,
                    value: c.value
                };
            });
            console.log('First 25 commodities:');
            choices.forEach(c => console.log(`- ${c.name}`));
            return;
        }

        // Score and filter commodities
        const getMatchScore = (commodity, search) => {
            const code = commodity.code.toUpperCase();
            const name = commodity.name.toUpperCase();
            const searchTerm = search.toUpperCase();

            // Exact matches get highest score
            if (code === searchTerm) return 100;
            if (name === searchTerm) return 90;

            // Code matches
            if (code.startsWith(searchTerm)) return 80;
            if (code.includes(searchTerm)) return 70;

            // Name matches
            if (name.startsWith(searchTerm)) return 60;
            
            // Word matches in name
            const words = name.split(' ');
            for (const word of words) {
                if (word.startsWith(searchTerm)) return 50;
                if (word.includes(searchTerm)) return 40;
            }

            // Partial matches in name
            if (name.includes(searchTerm)) return 30;

            // Match against slug (which contains full name in lowercase)
            const slug = commodity.value.replace(/-/g, ' ');
            if (slug.includes(searchTerm.toLowerCase())) return 20;

            return 0;
        };

        const filtered = commodities
            .map(c => {
                const score = getMatchScore(c, searchTerm);
                return { commodity: c, score };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 25)
            .map(item => {
                const fullName = item.commodity.value.split('-').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ');
                return {
                    name: `${item.commodity.code} - ${fullName}`,
                    value: item.commodity.value
                };
            });

        if (filtered.length > 0) {
            console.log('Matches found:');
            filtered.forEach(c => console.log(`- ${c.name} (${c.value})`));
        } else {
            console.log('No matches found');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run tests with different search terms
async function runTests() {
    // Test empty search (should show first 25)
    await testAutocomplete('');

    // Test exact matches
    await testAutocomplete('RMC');
    await testAutocomplete('GOLD');

    // Test partial matches
    await testAutocomplete('recycled');
    await testAutocomplete('mat');
    await testAutocomplete('comp');

    // Test case insensitivity
    await testAutocomplete('gold');
    await testAutocomplete('RECYCLED');
    await testAutocomplete('Material');
}

runTests();
