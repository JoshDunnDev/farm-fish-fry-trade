import { NextAuthOptions } from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import { prisma } from "./prisma";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
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
    userDataFetched?: boolean;
  }
}

// Discord profile type
interface DiscordProfile {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "identify",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile, trigger }) {
      // Handle initial sign in
      if (account && profile) {
        const discordProfile = profile as DiscordProfile;
        token.discordId = discordProfile.id;
        token.discordName = discordProfile.username;
        token.userDataFetched = false; // Mark that we need to fetch user data

        // Store or update user in database
        try {
          const user = await prisma.user.upsert({
            where: { discordId: discordProfile.id },
            update: {
              discordName: discordProfile.username,
              name: discordProfile.username,
              ...(profile.image && { image: profile.image }),
            },
            create: {
              discordId: discordProfile.id,
              discordName: discordProfile.username,
              name: discordProfile.username,
              image: profile.image,
              inGameName: null,
            },
          });

          // Cache user data in token to avoid future DB calls
          token.inGameName = user.inGameName;
          token.isAdmin = user.isAdmin || false;
          token.userDataFetched = true;
        } catch (error) {
          console.error("Error saving user to database:", error);
        }
      }

      // Fetch user data only if not already cached or on update trigger
      if (token.discordId && (!token.userDataFetched || trigger === "update")) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId as string },
          });
          if (dbUser) {
            token.inGameName = dbUser.inGameName;
            token.isAdmin = dbUser.isAdmin || false;
            token.userDataFetched = true;
          }
        } catch (error) {
          console.error("Error fetching user from database:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client from cached token data
      if (token) {
        session.user.id = token.discordId as string;
        session.user.discordId = token.discordId as string;
        session.user.discordName = token.discordName as string;
        session.user.inGameName = token.inGameName;
        session.user.isAdmin = token.isAdmin || false;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  debug: process.env.NODE_ENV === "development",
};
