import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  password: z.string().optional().refine(
    (val) => !val || val.length === 0 || val.length >= 8,
    'Password must be at least 8 characters'
  ),
  role: z.enum(['admin', 'reviewer']).default('reviewer'),
  isActive: z.boolean().default(true),
});

export const reviewSchema = z.object({
  applicationId: z.number().int().positive(),
  collaborationScore: z.number().int().min(1).max(4),
  curiosityScore: z.number().int().min(1).max(4),
  commitmentScore: z.number().int().min(1).max(4),
  comments: z.string().optional(),
});

export const draftReviewSchema = z.object({
  applicationId: z.number().int().positive(),
  collaborationScore: z.number().int().min(1).max(4).optional(),
  curiosityScore: z.number().int().min(1).max(4).optional(),
  commitmentScore: z.number().int().min(1).max(4).optional(),
  comments: z.string().optional(),
});

export const applicationCsvSchema = z.object({
  timestamp: z.string().optional(),
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required'),
  major: z.string().optional(),
  classStanding: z.string().optional(),
  fridayAvailability: z.string().optional(),
  resumeUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  question1Response: z.string().optional(),
  question2Response: z.string().optional(),
  question3Response: z.string().optional(),
  question4Response: z.string().optional(),
  question5Response: z.string().optional(),
  anythingElse: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
export type DraftReviewInput = z.infer<typeof draftReviewSchema>;
export type ApplicationCsvInput = z.infer<typeof applicationCsvSchema>;
