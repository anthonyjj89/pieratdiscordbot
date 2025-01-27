const axios = require('axios');
const cheerio = require('cheerio');

class TradeScraper {
    constructor() {
        this.baseUrl = 'https://sc-trade.tools';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/json, text/html'
        };
        this.cache = {
            commodities: null,
            prices: {},
            expires: {}
        };
        this.cacheTime = 60 * 60 * 1000; // 1 hour
    }

    async getCommodities() {
        // Check cache first
        if (this.cache.commodities && this.cache.commodities.expires > Date.now()) {
            return this.cache.commodities.data;
        }

        try {
            // Try API endpoint first
            const response = await axios.get(`${this.baseUrl}/api/commodities`, {
                headers: this.headers
            });
            
            const commodities = response.data;
            
            // Cache the results
            this.cache.commodities = {
                data: commodities,
                expires: Date.now() + this.cacheTime
            };

            return commodities;
        } catch (error) {
            // If API fails, scrape the page
            const response = await axios.get(`${this.baseUrl}/commodities`, {
                headers: this.headers
            });

            const $ = cheerio.load(response.data);
            const commodities = [];

            // Parse commodity list from dropdown
            $('select[name="commodity"] option').each((i, element) => {
                const value = $(element).val();
                if (value) {
                    commodities.push({
                        name: $(element).text().trim(),
                        value: value
                    });
                }
            });

            // Cache the results
            this.cache.commodities = {
                data: commodities,
                expires: Date.now() + this.cacheTime
            };

            return commodities;
        }
    }

    async getPrices(commodity) {
        // Check cache first
        if (
            this.cache.prices[commodity] &&
            this.cache.expires[commodity] > Date.now()
        ) {
            return this.cache.prices[commodity];
        }

        try {
            // Try API endpoint first
            const response = await axios.get(
                `${this.baseUrl}/api/commodities/${encodeURIComponent(commodity)}`,
                { headers: this.headers }
            );

            const prices = response.data;

            // Cache the results
            this.cache.prices[commodity] = prices;
            this.cache.expires[commodity] = Date.now() + this.cacheTime;

            return prices;
        } catch (error) {
            // If API fails, scrape the page
            const response = await axios.get(
                `${this.baseUrl}/commodities/${encodeURIComponent(commodity)}`,
                { headers: this.headers }
            );

            const $ = cheerio.load(response.data);
            const prices = {
                buyLocations: [],
                sellLocations: [],
                boxInfo: {
                    unitsPerBox: 100 // Default, we'll try to find the actual value
                }
            };

            // Parse buy locations
            $('.buy-locations tr').each((i, row) => {
                const location = $(row).find('td:first-child').text().trim();
                const price = parseFloat($(row).find('td:nth-child(2)').text().trim());
                if (location && !isNaN(price)) {
                    prices.buyLocations.push({ location, price });
                }
            });

            // Parse sell locations
            $('.sell-locations tr').each((i, row) => {
                const location = $(row).find('td:first-child').text().trim();
                const price = parseFloat($(row).find('td:nth-child(2)').text().trim());
                if (location && !isNaN(price)) {
                    prices.sellLocations.push({ location, price });
                }
            });

            // Try to find box unit info
            const boxInfoText = $('.box-info').text();
            const unitsMatch = boxInfoText.match(/(\d+)\s*units/i);
            if (unitsMatch) {
                prices.boxInfo.unitsPerBox = parseInt(unitsMatch[1]);
            }

            // Calculate box prices
            if (prices.buyLocations.length > 0 && prices.sellLocations.length > 0) {
                const bestBuy = Math.min(...prices.buyLocations.map(l => l.price));
                const bestSell = Math.max(...prices.sellLocations.map(l => l.price));
                
                prices.boxInfo.buyPrice = bestBuy * prices.boxInfo.unitsPerBox;
                prices.boxInfo.sellPrice = bestSell * prices.boxInfo.unitsPerBox;
                prices.boxInfo.profit = prices.boxInfo.sellPrice - prices.boxInfo.buyPrice;
            }

            // Cache the results
            this.cache.prices[commodity] = prices;
            this.cache.expires[commodity] = Date.now() + this.cacheTime;

            return prices;
        }
    }

    // Helper method to format prices nicely
    formatPrice(price) {
        return price.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}

module.exports = new TradeScraper();
