import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/shared';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Simple password-based authentication
        const adminPassword = process.env.ADMIN_PASSWORD;
        
        if (!adminPassword) {
          throw new Error('Admin password not configured');
        }
        
        if (credentials?.password === adminPassword) {
          return {
            id: 'admin',
            email: 'admin@ideaforge.com',
            name: 'Admin',
            role: 'admin',
          };
        }
        
        // No signup allowed - only admin can authenticate
        return null;
      },
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async signIn({ user }: { user: any }) {
      if (user && user.email) {
        // Create or update admin user in database
        await prisma.user.upsert({
          where: { email: user.email },
          update: {
            name: user.name,
            updatedAt: new Date(),
          },
          create: {
            email: user.email,
            name: user.name,
          },
        });
      }
      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
};