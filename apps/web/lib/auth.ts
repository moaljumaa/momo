import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@momo/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // Sign-up is disabled: the first admin is created once by /api/setup, everyone else by that
  // admin from the Team page.
  emailAndPassword: { enabled: true, disableSignUp: true },
  // Self-hosted instances have no mail server, so emails are never "verified" — let users
  // change theirs directly from account settings instead of waiting on a verification email.
  user: {
    additionalFields: { role: { type: "string", input: false } },
    changeEmail: { enabled: true, updateEmailWithoutVerification: true },
  },
  plugins: [nextCookies()],
});
