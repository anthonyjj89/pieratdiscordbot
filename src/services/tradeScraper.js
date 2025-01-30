const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

class TradeScraper {
    constructor() {
        // Initialize logging
        this.logFile = 'memlog/tasks/2025-01-task-log.md';
        
        // Load sample pages for parsing
        const samplesDir = path.join(__dirname, '../../RSI Page samples');
        
        // Ensure memlog directory exists
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
        this.commoditiesHtml = fs.readFileSync(path.join(samplesDir, 'UEX Page Com.html'), 'utf8');
        this.samplePriceHtml = fs.readFileSync(path.join(samplesDir, 'UEX Page Sample.html'), 'utf8');
    }

    // Format price with commas
    formatPrice(price) {
        return price.toLocaleString();
    }

    // Get list of all commodities
    async getCommodities() {
        const $ = cheerio.load(this.commoditiesHtml);
        
        try {
            const results = $('.label-commodity').map((i, el) => {
                const $el = $(el);
                const name = $el.find('span').first().text().trim();
                const code = $el.find('span').first().text().trim();
                const priceText = $el.find('span').last().text().trim();
                const price = parseInt(priceText.match(/\d+/)?.[0] || '0');
                
                return {
                    name: name,
                    code: code,
                    value: $el.attr('slug'),
                    avgPrice: price
                };
            }).get();

            fs.appendFileSync(this.logFile, 
                `| SCRP-UEX | Scraped ${results.length} commodities | ${new Date().toISOString()} |\n`);
            return results;
        } catch (error) {
            fs.appendFileSync(this.logFile,
                `| SCRP-FAIL | Commodity scrape failed: ${error.message} | ${new Date().toISOString()} |\n`);
            throw error;
        }
    }

    // Get prices for a specific commodity
    async getPrices(commodity) {
        const $ = cheerio.load(this.samplePriceHtml);
        const locations = [];
        
        // Parse each location row
        $('#table-sell tr.row-location').each((i, row) => {
            const $row = $(row);
            const name = $row.find('td:first-child a').text().trim();
            const price = parseInt($row.find('td[data-value]').first().attr('data-value'));
            const inventory = parseInt($row.find('td[title*="SCU"]').attr('data-value') || '0');
            
            if (name && price) {
                locations.push({ name, price, inventory });
            }
        });

        // Sort by price descending
        locations.sort((a, b) => b.price - a.price);

        // Calculate average price
        const totalPrice = locations.reduce((sum, loc) => sum + loc.price, 0);
        const averagePrice = Math.round(totalPrice / locations.length);

        return {
            bestLocation: locations[0],
            averagePrice,
            allLocations: locations,
            boxInfo: {
                unitsPerBox: 100 // Standard box size
            }
        };
    }

    // Format location name to be shorter/cleaner
    formatLocationName(name) {
        return name
            .replace(' Maintenance', '')
            .replace(' and ', ' & ')
            .replace('Reclamation & Disposal', 'R&D');
    }
}

module.exports = new TradeScraper();
