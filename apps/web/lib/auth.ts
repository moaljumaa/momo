import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@momo/db";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true },
  user: { additionalFields: { role: { type: "string", input: false } } },
  databaseHooks: {
    user: {
      create: {
        // single tenant: only the first user may sign up, and becomes admin
        before: async (user) => {
          if ((await prisma.user.count()) > 0) return false;
          return { data: { ...user, role: "ADMIN" } };
        },
      },
    },
  },
  plugins: [nextCookies()],
});
