import { z } from "zod";

export const websiteStageSchema = z.object({
  reportId: z.string().uuid(), revision: z.number().int().positive(),
  packageFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  title: z.string().min(1),
  previewPath: z.string().regex(/^\/reports\/preview\/[a-f0-9-]+\/report$/),
  catalogPreviewPath: z.string().regex(/^\/reports\/preview\/[a-f0-9-]+$/),
  status: z.literal("staged"),
}).strict();
export type WebsiteStage = z.infer<typeof websiteStageSchema>;

export const websiteUpdateSchema = z.object({
  reportPath: z.string().regex(/^\/reports\/[a-z0-9-]+$/),
  catalogPath: z.literal("/reports"), revision: z.number().int().positive(),
  status: z.literal("approved-local"), productionDeployed: z.literal(false),
}).strict();
export type WebsiteUpdate = z.infer<typeof websiteUpdateSchema>;

export class WebsiteRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export async function websiteResponse(response: Response) {
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(value);
    throw new WebsiteRequestError(error.success ? error.data.error : "The website couldn't save this report. Try again.", response.status);
  }
  return value;
}
