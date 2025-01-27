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

            // Get organization info and SID
            const orgElement = $('.org-name');
            let orgInfo = null;

            if (orgElement.length > 0) {
                const orgLink = orgElement.closest('a').attr('href');
                const orgSID = orgLink ? orgLink.split('/')[2] : null;

                if (orgSID) {
                    // Get organization details
                    const orgResponse = await axios.get(`https://robertsspaceindustries.com/orgs/${orgSID}/members`, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });

                    const org$ = cheerio.load(orgResponse.data);
                    const memberCount = org$('.member-item').length;

                    orgInfo = {
                        name: orgElement.text().trim(),
                        sid: orgSID,
                        rank: $('.org-rank').text().trim() || 'N/A',
                        memberCount: memberCount,
                        url: `https://robertsspaceindustries.com/orgs/${orgSID}`
                    };
                }
            }

            // Extract profile data
            const data = {
                handle: $('.info .value').first().text().trim(),
                signupDate: $('.info .value').eq(1).text().trim(),
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
