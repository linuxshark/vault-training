import { z } from "zod";

export const MDX_KINDS = ["explained", "notes", "notes-es", "lab"] as const;
export const SOURCES = ["claude", "ismet55555", "btkrausen"] as const;

export type MdxKind = (typeof MDX_KINDS)[number];
export type Source = (typeof SOURCES)[number];

export const FrontmatterSchema = z.object({
  objectiveId: z.string().min(1),
  taskSlug: z.string().min(1),
  kind: z.enum(MDX_KINDS),
  title: z.string().min(1),
  source: z.enum(SOURCES),
  sourceUrl: z.string().url(),
  license: z.string().min(1),
  order: z.number().int().nonnegative(),
  estMinutes: z.number().int().positive().optional(),
});

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
