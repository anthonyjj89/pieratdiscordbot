const axios = require('axios');
const cheerio = require('cheerio');

class RSIScraper {
    async getProfileData(username) {
        try {
            const response = await axios.get(`https://robertsspaceindustries.com/citizens/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(response.data);

            // Check if profile exists
            if ($('.not-found').length > 0) {
                throw new Error('Profile not found');
            }

            // Get organization info
            const orgElement = $('.org-name');
            const orgInfo = orgElement.length > 0 ? {
                name: orgElement.text().trim(),
                rank: $('.org-rank').text().trim() || 'N/A'
            } : null;

            // Extract profile data
            const data = {
                handle: $('.info .value').first().text().trim(),
                enlisted: $('.profile-content .left-col .value').first().text().trim(),
                location: $('.profile-content .right-col .value').first().text().trim(),
                organization: orgInfo
            };

            return data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                throw new Error('Profile not found');
            }
            throw error;
        }
    }
}

module.exports = new RSIScraper();
