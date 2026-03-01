import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { supabaseAdmin } from "./supabase";

declare module "next-auth" {
  interface Session {
    user: {
      profileId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    profileId?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          access_type: "offline",
          prompt: "consent",
          scope:
            "openid email profile https://www.googleapis.com/auth/calendar.readonly",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        // First sign-in: upsert user into profiles table with Google tokens
        const email = profile.email!;
        const name = profile.name || "";

        const { data: existing } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();

        if (existing) {
          // Update tokens
          await supabaseAdmin
            .from("profiles")
            .update({
              google_access_token: account.access_token,
              google_refresh_token: account.refresh_token,
            })
            .eq("email", email);

          token.profileId = existing.id;
        } else {
          // Create new user
          const { data: newUser } = await supabaseAdmin
            .from("profiles")
            .insert({
              email,
              name,
              google_access_token: account.access_token,
              google_refresh_token: account.refresh_token,
            })
            .select("id")
            .single();

          token.profileId = newUser?.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token.profileId) {
        session.user.profileId = token.profileId;
      }
      return session;
    },

    async redirect() {
      return "/auth/success";
    },
  },
};
