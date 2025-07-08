import NextAuth from 'next-auth/next';
import CredentialsProvider from 'next-auth/providers/credentials';

const authOptions = {
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

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };