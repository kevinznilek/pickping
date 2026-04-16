import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const organizer = await db.organizer.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });

        if (!organizer) {
          throw new Error('No organizer found with this email');
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          organizer.password_hash
        );

        if (!isPasswordValid) {
          throw new Error('Invalid password');
        }

        return {
          id: organizer.id,
          email: organizer.email,
          name: organizer.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function createOrganizer(data: {
  email: string;
  password: string;
  name: string;
  phone: string;
  venmo_username?: string;
}) {
  const hashedPassword = await hashPassword(data.password);

  return db.organizer.create({
    data: {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      venmo_username: data.venmo_username,
      password_hash: hashedPassword,
    },
  });
}