const puppeteer = require('puppeteer');

class RSIScraper {
    async getProfileData(username) {
        const browser = await puppeteer.launch({ headless: "new" });
        try {
            const page = await browser.newPage();
            await page.goto(`https://robertsspaceindustries.com/citizens/${username}`, {
                waitUntil: 'networkidle0'
            });

            // Check if profile exists
            const notFoundElement = await page.$('.not-found');
            if (notFoundElement) {
                throw new Error('Profile not found');
            }

            // Extract profile data
            const data = await page.evaluate(() => {
                const getTextContent = (selector) => {
                    const element = document.querySelector(selector);
                    return element ? element.textContent.trim() : null;
                };

                // Get organization info
                const orgElement = document.querySelector('.org-name');
                const orgInfo = orgElement ? {
                    name: orgElement.textContent.trim(),
                    rank: document.querySelector('.org-rank')?.textContent.trim() || 'N/A'
                } : null;

                return {
                    handle: getTextContent('.info .value'),
                    joinDate: getTextContent('.info .value:nth-child(2)'),
                    organization: orgInfo,
                    enlisted: getTextContent('.profile-content .left-col .value'),
                    location: getTextContent('.profile-content .right-col .value')
                };
            });

            return data;
        } catch (error) {
            throw error;
        } finally {
            await browser.close();
        }
    }
}

module.exports = new RSIScraper();
