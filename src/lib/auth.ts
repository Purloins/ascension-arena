// src/lib/auth.ts
// NextAuth v5 (beta) — osu! OAuth + Prisma adapter.

import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { NextAuthConfig } from "next-auth";

const osuProvider = {
  id: "osu",
  name: "osu!",
  type: "oauth" as const,
  authorization: {
    url: "https://osu.ppy.sh/oauth/authorize",
    params: { scope: "identify public", response_type: "code" },
  },
  token: "https://osu.ppy.sh/oauth/token",
  userinfo: "https://osu.ppy.sh/api/v2/me",
  clientId: process.env.OSU_CLIENT_ID!,
  clientSecret: process.env.OSU_CLIENT_SECRET!,

  profile(profile: OsuProfile) {
    return {
      id: String(profile.id),
      name: profile.username,
      email: null,
      image: profile.avatar_url,
      osuId: String(profile.id),
      osuUsername: profile.username,
      osuRank: profile.statistics?.global_rank ?? null,
      osuCountry: profile.country_code ?? null,
      osuAvatar: profile.avatar_url,
    };
  },
};

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [osuProvider],
  session: { strategy: "database" },
  trustHost: true,

  callbacks: {
    async session({ session, user }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          osuId: (user as ExtendedUser).osuId,
          osuUsername: (user as ExtendedUser).osuUsername,
          osuRank: (user as ExtendedUser).osuRank,
          osuCountry: (user as ExtendedUser).osuCountry,
          osuAvatar: (user as ExtendedUser).osuAvatar,
          element: (user as ExtendedUser).element,
          registrationStatus: (user as ExtendedUser).registrationStatus,
        },
      };
    },

    async signIn({ user, account, profile }) {
      if (account?.provider === "osu" && profile) {
        const osuProfile = profile as unknown as OsuProfile;
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              osuId: String(osuProfile.id),
              osuUsername: osuProfile.username,
              osuRank: osuProfile.statistics?.global_rank ?? null,
              osuCountry: osuProfile.country_code ?? null,
              osuAvatar: osuProfile.avatar_url,
            },
          });
        } catch {
          // First sign-up: adapter creates the user; this update runs on later logins.
        }
      }
      return true;
    },
  },

  // NextAuth handles auth pages internally
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface OsuProfile {
  id: number;
  username: string;
  avatar_url: string;
  country_code: string;
  statistics?: { global_rank: number | null };
}

interface ExtendedUser {
  osuId?: string | null;
  osuUsername?: string | null;
  osuRank?: number | null;
  osuCountry?: string | null;
  osuAvatar?: string | null;
  element?: string | null;
  registrationStatus?: string | null;
}
