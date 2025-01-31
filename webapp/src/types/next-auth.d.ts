import NextAuth, { DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      discordId: string;
    } & DefaultSession['user'];
  }

  interface User {
    id: string;
    discordId: string;
    email: string;
    name: string;
    image?: string;
  }
}
