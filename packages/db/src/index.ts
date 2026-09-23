import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export { ConversationStatus } from "@prisma/client";
export type { Role, MessageRole, TicketStatus, Priority, HandoffField, HandoffFieldType } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  g.prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
if (process.env.NODE_ENV !== "production") g.prisma = prisma;
