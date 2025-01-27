# Star Citizen Profile Lookup Bot

A Discord bot that allows users to look up Star Citizen player profiles directly in Discord.

## Features

- Lookup Star Citizen profiles using `/lookup [username]`
- Displays profile information including:
  - Handle/Username
  - Enlistment date
  - Location
  - Organization details

## Setup

1. Clone the repository
```bash
git clone https://github.com/anthonyjj89/pieratdiscordbot.git
cd pieratdiscordbot
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file with your Discord bot credentials:
```
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
```

4. Deploy slash commands
```bash
npm run deploy
```

5. Start the bot
```bash
npm start
```

## Usage

Once the bot is running and invited to your server, use:
```
/lookup username
```
Replace `username` with the Star Citizen handle you want to look up.

## Hosting

This bot is designed to be hosted on Railway.app. To deploy:

1. Fork this repository
2. Create a new project on Railway.app
3. Connect your GitHub repository
4. Add environment variables (DISCORD_TOKEN and CLIENT_ID)
5. Deploy!

## License

ISC
