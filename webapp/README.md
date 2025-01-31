# PieRat Web App

A web application for managing Star Citizen piracy operations, crew management, and hit reporting.

## Features

- Discord authentication
- Organization management
- Hit reporting and tracking
- Crew management and profit sharing
- Analytics and statistics
- Multi-tenant support

## Prerequisites

- Node.js 18+
- MongoDB
- Discord application credentials

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.local` to `.env.local`
   - Update the following variables:
     - `MONGODB_URI`: Your MongoDB connection string
     - `DISCORD_CLIENT_ID`: Your Discord application client ID
     - `DISCORD_CLIENT_SECRET`: Your Discord application client secret
     - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

3. Create a Discord application:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Under OAuth2, add redirect URI: `http://localhost:3000/api/auth/callback/discord`
   - Copy Client ID and Client Secret to `.env.local`

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
src/
  ├── app/                # Next.js app router pages
  │   ├── (auth)/        # Authentication pages
  │   └── (dashboard)/   # Dashboard pages
  ├── components/        # React components
  │   ├── auth/         # Authentication components
  │   ├── dashboard/    # Dashboard components
  │   └── ui/           # Shared UI components
  ├── lib/              # Utility functions
  └── models/           # MongoDB models
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Create a feature branch
2. Commit your changes
3. Push to the branch
4. Create a Pull Request

## License

MIT
