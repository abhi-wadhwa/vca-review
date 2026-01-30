import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 50 }).unique().notNull(),
  email: varchar('email', { length: 255 }).unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('reviewer'),
  createdAt: timestamp('created_at').defaultNow(),
  lastLogin: timestamp('last_login'),
  isActive: boolean('is_active').default(true),
});

export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(reviews),
  draftReviews: many(draftReviews),
  assignments: many(assignments),
  auditLogs: many(auditLogs),
}));

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  timestamp: varchar('timestamp', { length: 100 }),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  major: varchar('major', { length: 255 }),
  classStanding: varchar('class_standing', { length: 50 }),
  fridayAvailability: varchar('friday_availability', { length: 255 }),
  resumeUrl: text('resume_url'),
  linkedinUrl: text('linkedin_url'),
  question1Response: text('question1_response'),
  question2Response: text('question2_response'),
  question3Response: text('question3_response'),
  question4Response: text('question4_response'),
  question5Response: text('question5_response'),
  anythingElse: text('anything_else'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  batchId: varchar('batch_id', { length: 50 }),
  isArchived: boolean('is_archived').default(false),
});

export const applicationsRelations = relations(applications, ({ many }) => ({
  reviews: many(reviews),
  draftReviews: many(draftReviews),
  assignments: many(assignments),
}));

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: integer('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  collaborationScore: integer('collaboration_score').notNull(),
  curiosityScore: integer('curiosity_score').notNull(),
  commitmentScore: integer('commitment_score').notNull(),
  totalScore: integer('total_score').notNull(),
  comments: text('comments'),
  startedAt: timestamp('started_at'),
  submittedAt: timestamp('submitted_at').defaultNow(),
}, (table) => ({
  uniqueReview: unique().on(table.applicationId, table.reviewerId),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  application: one(applications, {
    fields: [reviews.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
}));

export const draftReviews = pgTable('draft_reviews', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: integer('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  collaborationScore: integer('collaboration_score'),
  curiosityScore: integer('curiosity_score'),
  commitmentScore: integer('commitment_score'),
  comments: text('comments'),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  uniqueDraft: unique().on(table.applicationId, table.reviewerId),
}));

export const draftReviewsRelations = relations(draftReviews, ({ one }) => ({
  application: one(applications, {
    fields: [draftReviews.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [draftReviews.reviewerId],
    references: [users.id],
  }),
}));

export const assignments = pgTable('assignments', {
  id: serial('id').primaryKey(),
  applicationId: integer('application_id').references(() => applications.id, { onDelete: 'cascade' }).notNull(),
  reviewerId: integer('reviewer_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  assignedAt: timestamp('assigned_at').defaultNow(),
}, (table) => ({
  uniqueAssignment: unique().on(table.applicationId, table.reviewerId),
}));

export const assignmentsRelations = relations(assignments, ({ one }) => ({
  application: one(applications, {
    fields: [assignments.applicationId],
    references: [applications.id],
  }),
  reviewer: one(users, {
    fields: [assignments.reviewerId],
    references: [users.id],
  }),
}));

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: integer('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type Review = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;
export type DraftReview = typeof draftReviews.$inferSelect;
export type NewDraftReview = typeof draftReviews.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
