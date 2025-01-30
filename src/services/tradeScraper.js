const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class TradeScraper {
    constructor() {
        // Initialize logging
        this.logFile = 'memlog/tasks/2025-01-task-log.md';
        
        // Ensure memlog directory exists
        if (!fs.existsSync(path.dirname(this.logFile))) {
            fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
        }
    }

    // Format price with commas
    formatPrice(price) {
        return price.toLocaleString();
    }

    // Fetch page from UEX
    async fetchUexPage(commodity) {
        try {
            const response = await axios.get(`https://uexcorp.space/commodities/info/name/${commodity}/tab/locations_buying/`);
            return response.data;
        } catch (error) {
            fs.appendFileSync(this.logFile,
                `| SCRP-FAIL | UEX fetch failed: ${error.message} | ${new Date().toISOString()} |\n`);
            throw error;
        }
    }

    // Get list of all commodities
    async getCommodities() {
        try {
            const response = await axios.get('https://uexcorp.space/commodities');
            const $ = cheerio.load(response.data);
            
            const results = $('.label-commodity').map((i, el) => {
                const $el = $(el);
                const name = $el.find('span').first().text().trim();
                const code = name.split(' ')[0]; // Get first word as code
                const priceText = $el.find('span').last().text().trim();
                const isNA = priceText.includes('N/A');
                const price = isNA ? null : parseInt(priceText.match(/\d+/)?.[0] || '0');
                const slug = $el.attr('slug') || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                
                return {
                    name: name,
                    code: code,
                    value: slug,
                    avgPrice: price,
                    isPriceNA: isNA
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
        try {
            const html = await this.fetchUexPage(commodity);
            const $ = cheerio.load(html);
            const locations = [];
            
            // Parse each location row
            $('#table-sell tr.row-location').each((i, row) => {
                const $row = $(row);
                const name = $row.find('td:first-child a').text().trim();
                const orbit = $row.find('td:nth-child(2)').text().trim();
                const system = $row.find('td:nth-child(3)').text().trim();
                const faction = $row.find('td:nth-child(4)').text().trim();
                
                // Get price data
                const price = parseInt($row.find('td[data-value]').eq(10).attr('data-value'));
                const minPrice = parseInt($row.find('td[data-value]').eq(13).attr('data-value'));
                const maxPrice = parseInt($row.find('td[data-value]').eq(14).attr('data-value'));
                const avgPrice = parseInt($row.find('td[data-value]').eq(12).attr('data-value'));
                
                // Get inventory data
                const inventory = parseInt($row.find('td[title*="SCU"]').first().attr('data-value') || '0');
                const minInventory = parseInt($row.find('td[data-value]').eq(7).attr('data-value'));
                const maxInventory = parseInt($row.find('td[data-value]').eq(8).attr('data-value'));
                const avgInventory = parseInt($row.find('td[data-value]').eq(6).attr('data-value'));
                
                // Get container sizes
                const containerText = $row.find('td[title*="SCU"]').last().attr('title') || '';
                const containerSizes = containerText.match(/\d+/g)?.map(Number) || [];
                
                // Check if it's a "No Questions Asked" terminal
                const isNoQuestions = $row.find('i.fa-low-vision').length > 0;
                
            if (name) {
                    locations.push({
                        name,
                        orbit,
                        system,
                        faction,
                        price: {
                            current: price,
                            min: minPrice,
                            max: maxPrice,
                            avg: avgPrice
                        },
                        inventory: {
                            current: inventory,
                            min: minInventory,
                            max: maxInventory,
                            avg: avgInventory
                        },
                        containerSizes,
                        isNoQuestions
                    });
                }
            });

            // Sort by price descending
            locations.sort((a, b) => b.price.current - a.price.current);

            // Calculate average price (excluding locations with no price)
            const validPrices = locations.filter(loc => loc.price && loc.price.current);
            const averagePrice = validPrices.length > 0
                ? Math.round(validPrices.reduce((sum, loc) => sum + loc.price.current, 0) / validPrices.length)
                : null;

            fs.appendFileSync(this.logFile,
                `| SCRP-UEX | Scraped ${locations.length} locations for ${commodity} | ${new Date().toISOString()} |\n`);

            return {
                bestLocation: locations[0],
                averagePrice,
                allLocations: locations,
                boxInfo: {
                    unitsPerBox: 100 // Standard box size
                }
            };
        } catch (error) {
            fs.appendFileSync(this.logFile,
                `| SCRP-FAIL | Price scrape failed for ${commodity}: ${error.message} | ${new Date().toISOString()} |\n`);
            throw error;
        }
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
