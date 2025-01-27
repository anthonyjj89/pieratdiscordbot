const axios = require('axios');
const cheerio = require('cheerio');

class RSIScraper {
    async getProfileData(username) {
        try {
            // Get profile data
            const profileResponse = await axios.get(`https://robertsspaceindustries.com/citizens/${username}`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const $ = cheerio.load(profileResponse.data);

            // Check if profile exists
            if ($('.not-found').length > 0) {
                throw new Error('Profile not found');
            }

            // Get basic profile info
            const handle = $('.info .value').first().text().trim();
            const signupDate = $('.info .entry:contains("Handle name") .value').text().trim();
            const enlisted = $('.left-col .entry:contains("Enlisted") .value').text().trim();
            const location = $('.left-col .entry:contains("Location") .value').text().trim();

            // Get organization info
            let orgInfo = null;
            const mainOrg = $('.main-org');
            
            if (mainOrg.length > 0) {
                const orgLink = mainOrg.find('a').first();
                const orgName = orgLink.text().trim();
                const orgHref = orgLink.attr('href');
                const orgSID = orgHref ? orgHref.split('/')[2] : null;
                const orgRank = mainOrg.find('.org-rank').text().trim() || 'N/A';

                if (orgSID) {
                    // Get organization details
                    const orgResponse = await axios.get(`https://robertsspaceindustries.com/orgs/${orgSID}`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    const org$ = cheerio.load(orgResponse.data);
                    const memberCount = org$('.logo .count').text().trim().split(' ')[0] || 'Unknown';

                    orgInfo = {
                        name: orgName,
                        sid: orgSID,
                        rank: orgRank,
                        memberCount: memberCount,
                        url: `https://robertsspaceindustries.com/orgs/${orgSID}`
                    };
                }
            }

            // Extract profile data
            const data = {
                handle,
                signupDate,
                enlisted,
                location,
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
