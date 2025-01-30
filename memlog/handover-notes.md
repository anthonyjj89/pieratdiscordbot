# PieRat Discord Bot - Handover Notes

## Project Overview

The PieRat Discord Bot is a specialized tool designed for Star Citizen piracy operations. It helps pirate organizations track hits, manage crew shares, and coordinate operations.

### Core Features
1. Profile Lookup (`/lookup`)
   - Fetches player profiles from RSI website
   - Shows piracy history
   - Displays organization affiliations
   - Includes "Report Hit" button

2. Hit Reporting System
   - Commodity selection with search/filter
   - SCU-based cargo tracking
   - Best price location suggestions
   - Crew share calculations
   - Role-based share ratios

3. Payment Tracking
   - Records crew shares
   - Tracks payments
   - Calculates balances

## Technical Architecture

### Tech Stack
- Node.js
- Discord.js for bot framework
- MongoDB for data storage
- Puppeteer for web scraping

### Directory Structure
```
src/
├── commands/         # Discord slash commands
├── services/         # Core services (DB, scraping)
└── utils/           # Helper functions

RSI Page samples/    # HTML samples for testing
data/               # Database files
memlog/             # System logs and notes
```

### Database Models
1. Report
   - Target handle
   - Cargo details
   - Price information
   - Location data

2. CrewMember
   - Role assignments
   - Share calculations
   - Payment tracking

3. Storage
   - Cargo holding records
   - Status tracking

4. PiracyHit
   - Historical records
   - Organization tracking

## Recent Changes

### Database Migration
- Moved from SQLite to MongoDB
- Added SSL/TLS security
- Improved connection settings
```javascript
{
    ssl: true,
    tls: true,
    tlsAllowInvalidCertificates: true,
    retryWrites: true,
    w: 'majority',
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000
}
```

### UI Flow Improvements
1. Report Hit Process
   - Changed from message-based to modal-based
   - Added commodity search/filter dropdown
   - Integrated price checking
   - Pre-fills best sell location

2. Crew Management
   - Role selection validation
   - Share ratio calculations
   - Payment tracking

## Known Issues

1. Discord API Limitations
   - No autocomplete in modals
   - Limited to 25 select menu options

2. Price Data
   - Occasional timeouts from UEX
   - Need better error handling
   - Price validation needed

3. UI Flow
   - Location selection could be dropdown
   - Better SCU validation needed
   - More detailed error messages

## Future Improvements

1. Technical Improvements
   - Add location selection dropdown
   - Improve error handling
   - Add input validation
   - Better price data caching

2. Feature Ideas
   - Crew reputation system
   - Operation scheduling
   - Market trend analysis
   - Automated price alerts

3. Code Quality
   - Add unit tests
   - Improve documentation
   - Error logging system

## Environment Setup

1. Required Environment Variables
```
DISCORD_TOKEN=bot_token
CLIENT_ID=client_id
MONGODB_URI=mongodb_connection_string
```

2. Development Setup
```bash
npm install        # Install dependencies
npm run deploy    # Deploy slash commands
npm start         # Start the bot
```

## Testing

Several test scripts available:
- test-prices.js: Test price fetching
- test-commodities.js: Test commodity data
- test-autocomplete.js: Test search functionality
- test-list.js: Test report listing
- test-payment.js: Test payment system
- test-insert.js: Test database operations

## Support

For any issues or questions:
1. Check error logs in memlog/
2. Review RSI Page samples/ for scraping issues
3. Test database connection with inspect-db.js
4. Verify Discord permissions for bot

## Deployment

Currently hosted on Railway.app:
1. Auto-deploys from main branch
2. Environment variables set in Railway dashboard
3. MongoDB Atlas for database
4. Continuous monitoring via Railway logs
