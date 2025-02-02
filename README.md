# PieRat - Star Citizen Piracy Management

A comprehensive system for managing Star Citizen piracy operations, consisting of a Discord bot for lookups and a web interface for hit reporting.

## Project Structure

This is a monorepo containing three main packages:

```
/
├── bot/                # Discord bot for lookups
│   ├── src/           # Bot source code
│   └── tests/         # Bot tests
├── shared/            # Shared code between bot and webapp
│   ├── models/        # MongoDB models
│   └── types/         # TypeScript types
└── webapp/            # Next.js web application
    └── src/           # Webapp source code
```

## Services

### Discord Bot
- Player profile lookup with organization history
- Cargo price checking and location info
- Links to webapp for hit reporting

### Web Interface
- Multi-tenant organization support
- Hit reporting and tracking
- Crew management and profit sharing
- Historical data and analytics

## Prerequisites

- Node.js 18+
- MongoDB
- Discord application credentials

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Discord Bot
DISCORD_TOKEN=           # Your bot token
CLIENT_ID=              # Bot client ID
GUILD_ID=               # Your Discord server ID

# MongoDB
MONGODB_URI=            # MongoDB connection string

# Web App (NextAuth)
NEXTAUTH_URL=           # Vercel URL (e.g., https://your-app.vercel.app)
NEXTAUTH_SECRET=        # Generate with: openssl rand -base64 32
DISCORD_CLIENT_ID=      # OAuth application client ID
DISCORD_CLIENT_SECRET=  # OAuth application client secret
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Build shared code:
```bash
npm run build:shared
```

3. Start the Discord bot:
```bash
npm run dev:bot
```

4. Start the web app:
```bash
npm run dev:web
```

## Deployment

The project uses different deployment platforms:

### Discord Bot
- Deployed on Railway
- Auto-deploys from main branch
- Environment variables configured in Railway dashboard

### Web App
- Deployed on Vercel
- Auto-deploys from main branch of webapp repository
- Environment variables configured in Vercel dashboard

## Git Workflow

The project uses two repositories:

1. Main Repository (this one):
   - Contains bot code and shared modules
   - Push directly to this repo for bot and shared code changes

2. Webapp Repository:
   - Located in webapp/
   - Has its own .git
   - Push webapp changes from the webapp directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
