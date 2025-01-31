# PieRat - Star Citizen Piracy Management

A comprehensive system for managing Star Citizen piracy operations, including a Discord bot and web interface.

## Services

### Discord Bot
- Profile lookup with piracy history
- Hit reporting and tracking
- Crew management and profit sharing
- Price checking and cargo value calculation

### Web Interface
- Dashboard with analytics
- Detailed hit reports
- Organization management
- Crew performance tracking
- Advanced search and filtering

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
NEXTAUTH_URL=           # Railway URL (e.g., https://your-app.up.railway.app)
NEXTAUTH_SECRET=        # Generate with: openssl rand -base64 32
DISCORD_CLIENT_ID=      # OAuth application client ID
DISCORD_CLIENT_SECRET=  # OAuth application client secret
```

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the Discord bot:
```bash
npm run dev
```

3. Start the web app:
```bash
npm run web:dev
```

## Deployment

The project is configured for deployment on Railway:

1. Create a new Railway project
2. Add MongoDB service
3. Configure environment variables
4. Connect your GitHub repository
5. Railway will automatically deploy both services

## Project Structure

```
/
├── src/                # Discord bot source
│   ├── commands/      # Bot commands
│   ├── services/      # Shared services
│   └── utils/         # Utility functions
│
└── webapp/            # Next.js web application
    ├── src/
    │   ├── app/      # Next.js pages
    │   ├── components/
    │   ├── lib/      # Utilities
    │   └── models/   # MongoDB models
    └── public/       # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
