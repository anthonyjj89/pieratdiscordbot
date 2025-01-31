import NextAuth from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      discordId: string;
      accessToken: string;
    } & DefaultSession['user'];
  }

  interface Profile {
    id: string;
    username: string;
    avatar: string;
    email?: string;
    guilds?: Array<{
      id: string;
      name: string;
      icon: string | null;
      owner: boolean;
      permissions: string;
    }>;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken: string;
    discordId: string;
  }
}
