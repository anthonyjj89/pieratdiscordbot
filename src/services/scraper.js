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
            const orgElement = $('.main-org .org-name');
            let orgInfo = null;

            if (orgElement.length > 0) {
                const orgLink = $('.main-org').find('a').attr('href');
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
                        rank: $('.main-org .org-rank').text().trim() || 'N/A',
                        memberCount: memberCount,
                        url: `https://robertsspaceindustries.com/orgs/${orgSID}`
                    };
                }
            }

            // Get handle and dates from profile info
            const handle = $('.profile .info .value').first().text().trim();
            const signupDate = $('.profile .info .value').eq(1).text().trim();
            const enlisted = $('.profile .left-col .value').first().text().trim();

            // Get location from the correct column
            const locationLabel = $('.profile .right-col .label').filter((i, el) => $(el).text().trim().toLowerCase() === 'location');
            const location = locationLabel.length > 0 ? locationLabel.next('.value').text().trim() : 'N/A';

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
