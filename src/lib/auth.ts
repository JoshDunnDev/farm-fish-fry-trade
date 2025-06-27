import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      discordId?: string;
      discordName?: string;
      inGameName?: string | null;
      isAdmin?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    discordName?: string;
    inGameName?: string | null;
    isAdmin?: boolean;
  }
}

// Discord profile type
interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
  email?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Persist the OAuth access_token and profile info to the token right after signin
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.discordId = discordProfile.id;
        token.discordName = discordProfile.username;

        // Store or update user in database
        try {
          await prisma.user.upsert({
            where: { discordId: discordProfile.id },
            update: {
              discordName: discordProfile.username,
              name: discordProfile.username,
              ...(discordProfile.email && { email: discordProfile.email }),
              ...(profile.image && { image: profile.image }),
            },
            create: {
              discordId: discordProfile.id,
              discordName: discordProfile.username,
              name: discordProfile.username,
              email: discordProfile.email,
              image: profile.image,
              inGameName: null,
            },
          });
        } catch (error) {
          console.error("Error saving user to database:", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = token.discordId as string;
        session.user.discordId = token.discordId as string;
        session.user.discordName = token.discordName as string;

        // Get latest user data from database to include inGameName and admin status
        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId as string },
          });
          if (dbUser) {
            session.user.inGameName = dbUser.inGameName;
            session.user.isAdmin = dbUser.isAdmin || false;
            token.inGameName = dbUser.inGameName; // Also update token for middleware
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
};
