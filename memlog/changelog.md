# Changelog

## [2025-02-01]

### Changed
- Major strategic shift:
  1. Simplified bot scope to lookup/cargo only
  2. Moved hit reporting entirely to webapp
  3. Added multi-tenant support for organizations
  4. Removed direct hit reporting from bot
  5. Added "Report Hit" button linking to webapp

### Added
- Next.js webapp initial setup
- Landing page with basic styling
- Tailwind CSS configuration
- Health check endpoints
- Discord auth configuration

### Issues
- Vercel deployment failing with 404s
- Next.js configuration problems
- Environment variable propagation issues

### Decisions
- Decided to simplify approach:
  1. Start with static pages
  2. Add features incrementally
  3. Focus on multi-tenant organization support
  4. Keep bot and webapp concerns completely separate

## [2025-01-31]

### Added
- Initial Discord bot setup
- Basic MongoDB integration
- Project documentation structure
- Sample RSI page scraping

### Changed
- Moved to Railway for bot hosting
- Updated bot commands structure

### Fixed
- MongoDB connection handling
- Command registration process
