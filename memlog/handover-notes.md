# Handover Notes - February 1, 2025

## Project Structure

We have two independent repositories:
1. pieratdiscordbot (Utility Bot)
   - Located at: e:/CODING PROJECTS/SC Name Check
   - Purpose: Player lookups and cargo price checks
   - Deployed on Railway
   - Provides links to webapp for hit reporting

2. pieratwebapp (Multi-tenant Web Platform)
   - Located at: e:/CODING PROJECTS/pieratwebapp
   - Purpose: Hit reporting and organization management
   - Deployed on Vercel
   - Multi-tenant support for different organizations

## Current Status

### What's Working
- Discord bot basic structure
- MongoDB connection
- Basic project setup for webapp

### Issues Encountered
1. Deployment Problems:
   - Vercel builds failing with 404s
   - Next.js configuration issues
   - Environment variables not properly propagating

2. Architecture Improvements:
   - Simplified bot scope
   - Moved hit reporting to webapp
   - Added multi-tenant support
   - Improved separation of concerns

## New Architecture

1. Discord Bot:
   - Core Commands:
     * /lookup - Show player info and org history
     * /cargo - Show commodity prices and locations
   - Features:
     * "Report Hit" button linking to webapp
     * Simple, focused utility functions
     * No direct hit reporting

2. Web Platform:
   - Multi-tenant System:
     * Organizations can register independently
     * Each org has private data space
     * Users belong to organizations
   
   - Core Features:
     * Hit Registration
     * Crew Management
     * Profit Sharing
     * Payment Tracking
   
   - Authentication:
     * Discord OAuth integration
     * Organization-level permissions
     * Role-based access control

## Development Strategy

1. Discord Bot:
   - Keep current setup
   - Remove hit reporting code
   - Add webapp deep links
   - Focus on utility functions

2. Webapp:
   - Multi-tenant foundation first
   - Organization management
   - Hit reporting system
   - Payment tracking
   - Historical data and analytics

## Next Steps

1. Bot Updates:
   - Remove hit reporting code
   - Add webapp deep links
   - Update documentation
   - Test deployment

2. Webapp Development:
   - Setup multi-tenant structure
   - Implement Discord auth
   - Create organization system
   - Build hit reporting flow

3. Integration:
   - Test bot-to-webapp links
   - Verify auth flow
   - Test multi-org isolation

## Development Guidelines

1. Bot Development:
   - Keep functionality focused on lookups/prices
   - Maintain simple command structure
   - Ensure proper error handling
   - Add clear webapp links

2. Webapp Development:
   - Focus on multi-tenant security
   - Keep organizations isolated
   - Implement proper access control
   - Build mobile-friendly UI

3. General Guidelines:
   - Test thoroughly
   - Document API changes
   - Keep security in mind
   - Regular backups
   - Monitor performance

## Lessons Learned

1. Architecture:
   - Keep services focused
   - Separate concerns clearly
   - Plan for multi-tenant early
   - Consider security first

2. Development Flow:
   - Start with core features
   - Add complexity gradually
   - Test each component
   - Document changes

3. Project Organization:
   - Keep repositories separate
   - Clear documentation
   - Regular updates
   - Version control
