import { z } from "zod";

export const TeamEntrySchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
    lead: z.string(),
    members: z.array(z.string()),
    description: z.string().optional(),
  })
  .strict();

export const TeamsSchema = z.array(TeamEntrySchema).optional();
