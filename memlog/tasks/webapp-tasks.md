# PieRat Web App Project Tasks

## Phase 1: Foundation
| Task ID | Description | Status | Dependencies | Notes |
|---------|-------------|--------|--------------|-------|
| F1.1 | Set up Next.js project with TypeScript | ✅ | - | Include ESLint, Prettier |
| F1.2 | Configure MongoDB connection | ✅ | F1.1 | Multi-tenant setup |
| F1.3 | Set up Discord OAuth | ✅ | F1.1 | Auth flow + token management |
| F1.4 | Create basic layout with Tailwind | ✅ | F1.1 | Responsive design |
| F1.5 | Implement user authentication | ✅ | F1.2, F1.3 | Session management |
| F1.6 | Create org management system | 🔲 | F1.2, F1.5 | CRUD operations |
| F1.7 | Basic hit reporting form | 🔲 | F1.5, F1.6 | Initial version |

## Phase 2: Core Features
| Task ID | Description | Status | Dependencies | Notes |
|---------|-------------|--------|--------------|-------|
| C2.1 | Migrate existing hit data | 🔲 | F1.2 | Data transformation |
| C2.2 | Implement crew management | 🔲 | F1.6 | Roles, permissions |
| C2.3 | Add cargo selection/pricing | 🔲 | F1.7 | UEX integration |
| C2.4 | Create basic dashboard | 🔲 | C2.1 | Key metrics |
| C2.5 | Add user roles/permissions | 🔲 | C2.2 | Role-based access |
| C2.6 | Set up Discord webhook integration | 🔲 | F1.7 | Report posting |
| C2.7 | Add basic search functionality | 🔲 | C2.1 | Simple filters |

## Phase 3: Analytics
| Task ID | Description | Status | Dependencies | Notes |
|---------|-------------|--------|--------------|-------|
| A3.1 | Add statistics dashboard | 🔲 | C2.4 | Overview stats |
| A3.2 | Hit frequency charts | 🔲 | A3.1 | Time-based analysis |
| A3.3 | Value tracking graphs | 🔲 | A3.1 | Profit trends |
| A3.4 | Crew performance stats | 🔲 | A3.1 | Member metrics |
| A3.5 | Cargo type analysis | 🔲 | A3.1 | Popular items |
| A3.6 | Add export functionality | 🔲 | A3.1 | CSV, JSON formats |
| A3.7 | Create custom report builder | 🔲 | A3.1 | Flexible reporting |

## Phase 4: Advanced Features
| Task ID | Description | Status | Dependencies | Notes |
|---------|-------------|--------|--------------|-------|
| V4.1 | Add inter-org sharing | 🔲 | C2.5 | Controlled access |
| V4.2 | Implement advanced search | 🔲 | C2.7 | Complex queries |
| V4.3 | Add mobile optimization | 🔲 | F1.4 | PWA features |
| V4.4 | Create API documentation | 🔲 | V4.1 | OpenAPI spec |
| V4.5 | Add webhook customization | 🔲 | C2.6 | Per-org settings |
| V4.6 | Implement backup system | 🔲 | C2.1 | Auto-backups |

## Status Key
- 🔲 Not Started
- 🟡 In Progress
- ✅ Completed
- ❌ Blocked

## Notes
- Each phase builds on the previous phase
- Dependencies must be completed before starting a task
- Status updates should be committed daily
- Add notes for blockers or important decisions
