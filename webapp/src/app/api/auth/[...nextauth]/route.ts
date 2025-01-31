import NextAuth from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI!);

interface DiscordProfile {
  id: string;
  username: string;
  avatar: string;
  email: string;
  verified: boolean;
  guilds?: Array<{
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    permissions: number;
  }>;
}

const handler = NextAuth({
  adapter: MongoDBAdapter(client),
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds'
        }
      },
      profile(profile: DiscordProfile) {
        return {
          id: profile.id,
          discordId: profile.id,
          name: profile.username,
          email: profile.email,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : undefined
        };
      }
    })
  ],
  callbacks: {
    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          discordId: user.discordId
        }
      };
    }
  },
  pages: {
    signIn: '/signin',
    error: '/error'
  }
});

export { handler as GET, handler as POST };
