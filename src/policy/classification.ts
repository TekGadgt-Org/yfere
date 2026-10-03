import { z } from 'zod';
export const DATA_CLASSES = ['synthetic','public','reviewed-minimized','private','proprietary','sensitive','unknown'] as const;
export const classificationSchema = z.enum(DATA_CLASSES);
export type DataClass = z.infer<typeof classificationSchema>;
export function isAllowedInput(value: unknown): boolean { return classificationSchema.safeParse(value).success && ['synthetic','public','reviewed-minimized'].includes(value as string); }
export const PROHIBITED_CLASSES = ['source code/diffs','credentials/secrets','user conversations','customer/third-party data','private paths/repository IDs','raw agent output','raw artifacts'] as const;
