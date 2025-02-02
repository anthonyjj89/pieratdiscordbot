# Project Structure

## Repositories

1. Discord Bot (pieratdiscordbot)
   - Location: e:/CODING PROJECTS/SC Name Check
   - Git: https://github.com/anthonyjj89/pieratdiscordbot
   - Deploy: Railway
   - Purpose: Player lookups and cargo prices

2. Web App (pieratwebapp)
   - Location: e:/CODING PROJECTS/pieratwebapp
   - Git: https://github.com/anthonyjj89/pieratwebapp
   - Deploy: Vercel
   - Purpose: Multi-tenant hit reporting platform

# Tasks

## Discord Bot Updates
- [ ] Remove hit reporting code:
  - Remove report button handlers
  - Remove crew management
  - Remove payment tracking
- [ ] Add webapp deep links:
  - "Report Hit" → /report/new?target=[player]
  - "View Profile" → /players/[handle]
  - "View Org" → /orgs/[sid]
- [ ] Update documentation
- [ ] Test deployment

## Web App Development
1. Multi-tenant Foundation
   - [ ] Organization model and management
   - [ ] User-organization relationships
   - [ ] Role-based permissions
   - [ ] Data isolation between orgs

2. Authentication
   - [ ] Discord OAuth integration
   - [ ] Organization registration flow
   - [ ] User-org invitation system
   - [ ] Permission management

3. Organization System
   - [ ] Organization profile
   - [ ] Member management
   - [ ] Role configuration
   - [ ] Settings and preferences

4. Hit Reporting
   - [ ] Report submission form
   - [ ] Crew assignment
   - [ ] Cargo tracking
   - [ ] Payment status
   - [ ] Historical data

5. Dashboard Views
   - [ ] Organization overview
   - [ ] Member activity
   - [ ] Hit statistics
   - [ ] Payment tracking

6. Database Schema
   - [ ] Organizations
     * Name, SID, logo
     * Settings and preferences
     * Member roles and permissions
   - [ ] Users
     * Discord linked
     * Organization memberships
     * Roles and permissions
   - [ ] Reports
     * Target information
     * Cargo details
     * Crew assignments
     * Payment status
   - [ ] Payments
     * Amount and distribution
     * Status tracking
     * Verification

# Current Priority
1. Setup multi-tenant foundation
2. Implement Discord auth
3. Create organization system
4. Build hit reporting flow

# Development Guidelines
1. Security First
   - Proper data isolation
   - Role-based access
   - Input validation
   - API security

2. User Experience
   - Mobile-friendly design
   - Clear navigation
   - Intuitive workflows
   - Responsive interface

3. Development Process
   - Test thoroughly
   - Document changes
   - Regular backups
   - Performance monitoring
