'use server';

import { db, applications, reviews, draftReviews } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and, notInArray, sql, desc } from 'drizzle-orm';
import { applicationCsvSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

export async function getNextUnreviewedApplication() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const reviewerId = parseInt(session.user.id);

  // Get IDs of applications already reviewed by this reviewer
  const reviewedIds = await db
    .select({ applicationId: reviews.applicationId })
    .from(reviews)
    .where(eq(reviews.reviewerId, reviewerId));

  const reviewedIdList = reviewedIds.map(r => r.applicationId);

  // Check for existing draft first
  const draft = await db.query.draftReviews.findFirst({
    where: eq(draftReviews.reviewerId, reviewerId),
    with: {
      application: true,
    },
  });

  if (draft?.application && !draft.application.isArchived) {
    return {
      application: draft.application,
      draft: {
        initiativeScore: draft.initiativeScore,
        collaborationScore: draft.collaborationScore,
        curiosityScore: draft.curiosityScore,
        commitmentScore: draft.commitmentScore,
        comments: draft.comments,
      },
    };
  }

  // Get next unreviewed application
  const query = reviewedIdList.length > 0
    ? db.query.applications.findFirst({
        where: and(
          notInArray(applications.id, reviewedIdList),
          eq(applications.isArchived, false)
        ),
        orderBy: [applications.uploadedAt],
      })
    : db.query.applications.findFirst({
        where: eq(applications.isArchived, false),
        orderBy: [applications.uploadedAt],
      });

  const application = await query;

  if (!application) {
    return { completed: true };
  }

  return { application };
}

export async function getApplicationById(id: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const application = await db.query.applications.findFirst({
    where: eq(applications.id, id),
  });

  return { application };
}

export async function uploadApplications(data: unknown[]) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const batchId = `batch_${Date.now()}`;
  const results = {
    success: 0,
    duplicates: 0,
    errors: [] as string[],
  };

  for (const row of data) {
    const parsed = applicationCsvSchema.safeParse(row);
    if (!parsed.success) {
      results.errors.push(`Invalid row: ${JSON.stringify(row)}`);
      continue;
    }

    // Check for duplicate by email
    const existing = await db.query.applications.findFirst({
      where: eq(applications.email, parsed.data.email),
    });

    if (existing) {
      results.duplicates++;
      continue;
    }

    await db.insert(applications).values({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phoneNumber: parsed.data.phoneNumber || null,
      university: parsed.data.university || null,
      major: parsed.data.major || null,
      graduationYear: parsed.data.graduationYear || null,
      linkedinUrl: parsed.data.linkedinUrl || null,
      resumeUrl: parsed.data.resumeUrl || null,
      question1Response: parsed.data.question1Response || null,
      question2Response: parsed.data.question2Response || null,
      question3Response: parsed.data.question3Response || null,
      batchId,
    });

    results.success++;
  }

  await logAction('UPLOAD_APPLICATIONS', 'application', undefined, {
    batchId,
    success: results.success,
    duplicates: results.duplicates,
    errors: results.errors.length,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/upload');
  revalidatePath('/review');

  return results;
}

export async function archiveApplication(id: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  await db
    .update(applications)
    .set({ isArchived: true })
    .where(eq(applications.id, id));

  await logAction('ARCHIVE_APPLICATION', 'application', id);

  revalidatePath('/admin');
  revalidatePath('/results');

  return { success: true };
}

export async function getApplicationStats() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const totalResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.isArchived, false));

  const reviewedResult = await db
    .select({ count: sql<number>`count(distinct ${reviews.applicationId})` })
    .from(reviews);

  const total = Number(totalResult[0]?.count) || 0;
  const reviewed = Number(reviewedResult[0]?.count) || 0;

  return {
    total,
    reviewed,
    pending: total - reviewed,
  };
}

export async function getAllApplicationsWithReviews() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const isAdmin = session.user.role === 'admin';

  const allApplications = await db.query.applications.findMany({
    where: eq(applications.isArchived, false),
    with: {
      reviews: {
        with: {
          reviewer: true,
        },
      },
    },
    orderBy: [desc(applications.uploadedAt)],
  });

  // If not admin, only show applications with 2+ reviews
  const filtered = isAdmin
    ? allApplications
    : allApplications.filter(app => app.reviews.length >= 2);

  return { applications: filtered };
}
