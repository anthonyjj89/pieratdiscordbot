 # Changelog

## [2025-01-31]

### Changed
- Migrated database from SQLite to MongoDB
- Updated database connection settings with improved SSL/TLS config
- Changed report flow from message-based to modal-based UI
- Updated cargo tracking to use SCU instead of boxes
- Added commodity search/filter dropdown
- Added best price location pre-fill
- Added price info display after commodity selection
- Added support for multiple cargo entries in hit reports
- Improved hit report UI with multi-step cargo selection
- Added advanced commodity search with relevance ranking

### Fixed
- Fixed commodity selection handling
- Fixed price data fetching in handleCargoDetails
- Fixed crew share calculations
- Fixed MongoDB TLS configuration conflicts
- Fixed null price handling in commodity selection

### Known Issues
- Discord Modal API limitations prevent autocomplete within modals
- Need better error handling for price data
- Need better SCU validation
- Location selection could be improved with dropdown

## [2025-01-30]

### Added
- Initial MongoDB integration
- New database models for reports, crew, storage
- Price checking integration with UEX
- Crew share calculation system
- Payment tracking system

### Changed
- Updated bot framework to latest Discord.js
- Improved error handling in profile lookup
- Enhanced organization data display

### Removed
- Old SQLite database system
- Legacy message-based UI components
