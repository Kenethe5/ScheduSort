import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // calendar read scope for free/busy
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // On first sign-in, persist access_token into the JWT
      if (account?.access_token) token.accessToken = account.access_token;
      if (account?.refresh_token) token.refreshToken = account.refresh_token;
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = (token as any).accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};