# Project Structure

## Repositories

1. Discord Bot (pieratdiscordbot)
   - Location: e:/CODING PROJECTS/SC Name Check
   - Git: https://github.com/anthonyjj89/pieratdiscordbot
   - Deploy: Railway
   - Purpose: Player lookups and basic info

2. Web App (pieratwebapp)
   - Location: e:/CODING PROJECTS/pieratwebapp
   - Git: https://github.com/anthonyjj89/pieratwebapp
   - Deploy: Vercel
   - Purpose: Detailed reports and organization management

# Tasks

## Discord Bot Updates
- [ ] Simplify to core commands:
  - /lookup - Show player info + org history
  - /cargo - Show cargo details
- [ ] Add webapp buttons:
  - "View Org Page" → /org/[org_name]
  - "Report Hit" → /report/[player]
- [ ] Update MongoDB integration:
  - Share models with webapp
  - Read-only access for lookups
  - Show org hit history

## Web App Development
1. Core Setup
   - [ ] Fix Discord authentication
   - [ ] Setup MongoDB models
   - [ ] Create base layout/navigation

2. Organization Pages (/org/[name])
   - [ ] Basic org info from RSI
   - [ ] Hit statistics
   - [ ] Member list
   - [ ] Risk assessment

3. Report Pages (/report/[player])
   - [ ] Report submission form
   - [ ] Payment tracking
   - [ ] Hit verification

4. Database Schema
   - [ ] Users (Discord linked)
   - [ ] Organizations
   - [ ] Reports/Hits
   - [ ] Payment Status

# Current Priority
1. Fix webapp deployment on Vercel
2. Get Discord auth working
3. Create basic organization pages

# Development Guidelines
1. Always verify working directory before git operations
2. Keep repositories separate and clean
3. Test changes locally before deployment
4. Document API changes that affect both services
