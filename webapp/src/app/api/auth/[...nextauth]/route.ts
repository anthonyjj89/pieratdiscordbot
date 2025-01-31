import NextAuth, { Profile } from 'next-auth';
import DiscordProvider from 'next-auth/providers/discord';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID ?? '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.accessToken = account.access_token ?? '';
        token.discordId = (profile as Profile).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId;
        session.user.accessToken = token.accessToken;
      }
      return session;
    },
    async signIn({ profile }) {
      if (!profile) return false;

      try {
        await connectDB();

        const discordProfile = profile as Profile;
        
        // Find or create user
        const existingUser = await User.findOne({ discordId: discordProfile.id });
        
        if (existingUser) {
          // Update last login
          await User.findOneAndUpdate(
            { discordId: discordProfile.id },
            { 
              lastLogin: new Date(),
              username: discordProfile.username,
              avatar: discordProfile.avatar,
            }
          );
        } else {
          // Create new user
          await User.create({
            discordId: discordProfile.id,
            username: discordProfile.username,
            avatar: discordProfile.avatar,
          });
        }

        return true;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
});

export { handler as GET, handler as POST };
