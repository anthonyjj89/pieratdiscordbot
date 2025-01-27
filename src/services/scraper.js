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
            const avatarUrl = $('.profile .thumb img').attr('src');

            // Get organizations data
            const orgsResponse = await axios.get(`https://robertsspaceindustries.com/citizens/${username}/organizations`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });

            const org$ = cheerio.load(orgsResponse.data);
            
            // Process main organization
            const mainOrgElement = org$('.box-content.org.main');
            let mainOrg = null;

            if (mainOrgElement.length > 0) {
                const isRedacted = mainOrgElement.hasClass('visibility-R');
                
                if (isRedacted) {
                    mainOrg = {
                        name: 'REDACTED',
                        sid: 'REDACTED',
                        rank: 'REDACTED',
                        memberCount: 'REDACTED',
                        url: null,
                        logoUrl: null,
                        isRedacted: true
                    };
                } else {
                    const orgLink = mainOrgElement.find('.info a').first();
                    const orgName = orgLink.text().trim();
                    const orgHref = orgLink.attr('href');
                    const orgSID = orgHref ? orgHref.split('/')[2] : null;
                    const orgRank = mainOrgElement.find('.info .value:contains("rank")').text().trim() || 'N/A';
                    const memberCount = mainOrgElement.find('.thumb .members').text().trim().split(' ')[0] || 'Unknown';
                    const logoUrl = mainOrgElement.find('.thumb img').attr('src');

                    mainOrg = {
                        name: orgName,
                        sid: orgSID,
                        rank: orgRank,
                        memberCount: memberCount,
                        url: `https://robertsspaceindustries.com/orgs/${orgSID}`,
                        logoUrl: logoUrl ? `https://robertsspaceindustries.com${logoUrl}` : null,
                        isRedacted: false
                    };
                }
            }

            // Process affiliated organizations
            const affiliatedOrgs = [];
            org$('.box-content.org.affiliation').each((i, element) => {
                const isRedacted = org$(element).hasClass('visibility-R');
                
                if (isRedacted) {
                    affiliatedOrgs.push({
                        name: 'REDACTED',
                        sid: 'REDACTED',
                        rank: 'REDACTED',
                        memberCount: 'REDACTED',
                        url: null,
                        logoUrl: null,
                        isRedacted: true
                    });
                } else {
                    const orgLink = org$(element).find('.info a').first();
                    const orgName = orgLink.text().trim();
                    const orgHref = orgLink.attr('href');
                    const orgSID = orgHref ? orgHref.split('/')[2] : null;
                    const orgRank = org$(element).find('.info .value:contains("rank")').text().trim() || 'N/A';
                    const memberCount = org$(element).find('.thumb .members').text().trim().split(' ')[0] || 'Unknown';
                    const logoUrl = org$(element).find('.thumb img').attr('src');

                    affiliatedOrgs.push({
                        name: orgName,
                        sid: orgSID,
                        rank: orgRank,
                        memberCount: memberCount,
                        url: `https://robertsspaceindustries.com/orgs/${orgSID}`,
                        logoUrl: logoUrl ? `https://robertsspaceindustries.com${logoUrl}` : null,
                        isRedacted: false
                    });
                }
            });

            // Extract profile data
            const data = {
                handle,
                signupDate,
                enlisted,
                location,
                avatarUrl: avatarUrl ? `https://robertsspaceindustries.com${avatarUrl}` : null,
                mainOrg,
                affiliatedOrgs
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
