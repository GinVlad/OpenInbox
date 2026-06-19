import { z } from 'zod';

export const createDomainSchema = z.object({
  name: z.string().min(1).max(255),
});

export const updateDomainSchema = z.object({
  enabled: z.number().refine((v) => v === 0 || v === 1),
});

export const createInboxSchema = z.object({
  name: z.string().min(3).max(64).regex(/^[a-z0-9._-]+$/),
  domainId: z.string().min(1),
});

export const updateMessageSchema = z.object({
  isRead: z.number().refine((v) => v === 0 || v === 1),
});

export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

export const searchSchema = z.object({
  q: z.string().min(1),
  inboxId: z.string().optional(),
});
