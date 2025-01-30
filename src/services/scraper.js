const axios = require('axios');
const cheerio = require('cheerio');

class RSIScraper {
    constructor() {
        this.baseUrl = 'https://robertsspaceindustries.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };
        this.axiosConfig = {
            timeout: 10000,    // 10 second timeout
            retries: 3,        // retry 3 times
            retryDelay: 1000   // wait 1 second between retries
        };
    }

    normalizeUrl(url) {
        if (!url) return null;
        return url.startsWith('http') ? url : `${this.baseUrl}${url}`;
    }

    async makeRequest(url, options = {}) {
        let retries = this.axiosConfig.retries;
        let lastError;

        while (retries > 0) {
            try {
                const response = await axios({
                    url,
                    headers: this.headers,
                    timeout: this.axiosConfig.timeout,
                    ...options
                });
                return response;
            } catch (error) {
                lastError = error;
                retries--;
                if (retries === 0) break;
                console.log(`Request failed, retrying... (${retries} attempts left)`);
                await new Promise(resolve => setTimeout(resolve, this.axiosConfig.retryDelay));
            }
        }

        throw lastError;
    }

    async getProfileData(username) {
        try {
            // Get profile data
            console.log(`Fetching profile for ${username}...`);
            const profileResponse = await this.makeRequest(`${this.baseUrl}/citizens/${username}`);
            const $ = cheerio.load(profileResponse.data);

            // Check if profile exists
            if ($('.not-found').length > 0) {
                const error = new Error('Profile not found');
                error.username = username;
                throw error;
            }

            // Get basic profile info
            const handle = $('.info .value').first().text().trim();
            const signupDate = $('.info .entry:contains("Handle name") .value').text().trim();
            const enlisted = $('.left-col .entry:contains("Enlisted") .value').text().trim();
            const location = $('.left-col .entry:contains("Location") .value').text().trim();
            const avatarUrl = this.normalizeUrl($('.profile .thumb img').attr('src'));

            // Get organizations data
            console.log(`Fetching org data for ${username}...`);
            const orgsResponse = await this.makeRequest(`${this.baseUrl}/citizens/${username}/organizations`);
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
                    const logoUrl = this.normalizeUrl(mainOrgElement.find('.thumb img').attr('src'));

                    mainOrg = {
                        name: orgName,
                        sid: orgSID,
                        rank: orgRank,
                        memberCount: memberCount,
                        url: orgSID ? `${this.baseUrl}/orgs/${orgSID}` : null,
                        logoUrl: logoUrl,
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
                    const logoUrl = this.normalizeUrl(org$(element).find('.thumb img').attr('src'));

                    affiliatedOrgs.push({
                        name: orgName,
                        sid: orgSID,
                        rank: orgRank,
                        memberCount: memberCount,
                        url: orgSID ? `${this.baseUrl}/orgs/${orgSID}` : null,
                        logoUrl: logoUrl,
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
                avatarUrl,
                mainOrg,
                affiliatedOrgs
            };

            console.log(`Successfully fetched data for ${username}`);
            return data;

        } catch (error) {
            console.error(`Error fetching data for ${username}:`, error.message);
            if (error.response?.status === 404) {
                const notFoundError = new Error('Profile not found');
                notFoundError.username = username;
                throw notFoundError;
            }
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timed out. The RSI website might be slow or down.');
            }
            if (error.response?.status === 429) {
                throw new Error('Rate limited by RSI website. Please try again in a few minutes.');
            }
            throw error;
        }
    }
}

module.exports = new RSIScraper();
