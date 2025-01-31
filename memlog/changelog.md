# Changelog

## [2025-02-01]

### Added
- Next.js webapp initial setup
- Landing page with basic styling
- Tailwind CSS configuration
- Health check endpoints
- Discord auth configuration (removed)

### Changed
- Updated project structure documentation
- Simplified bot scope to lookup/cargo only
- Revised development approach in handover notes

### Issues
- Vercel deployment failing with 404s
- Next.js configuration problems
- Environment variable propagation issues

### Decisions
- Decided to simplify approach:
  1. Start with static pages
  2. Add features incrementally
  3. Add auth later
  4. Keep bot and webapp concerns separate

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
