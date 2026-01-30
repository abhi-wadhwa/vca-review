'use server';

import { db, applications, reviews, draftReviews, assignments } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
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

  // Get assignments for this reviewer
  const myAssignments = await db.query.assignments.findMany({
    where: eq(assignments.reviewerId, reviewerId),
  });

  // If no assignments, reviewer has nothing to review
  if (myAssignments.length === 0) {
    return { completed: true };
  }

  const assignedAppIds = myAssignments.map(a => a.applicationId);
  const unreviewedAssignedIds = assignedAppIds.filter(id => !reviewedIdList.includes(id));

  if (unreviewedAssignedIds.length === 0) {
    return { completed: true };
  }

  // Check for existing draft on an assigned application
  const draft = await db.query.draftReviews.findFirst({
    where: and(
      eq(draftReviews.reviewerId, reviewerId),
      inArray(draftReviews.applicationId, unreviewedAssignedIds)
    ),
    with: {
      application: true,
    },
  });

  if (draft?.application && !draft.application.isArchived) {
    return {
      application: draft.application,
      draft: {
        collaborationScore: draft.collaborationScore,
        curiosityScore: draft.curiosityScore,
        commitmentScore: draft.commitmentScore,
        comments: draft.comments,
      },
    };
  }

  const application = await db.query.applications.findFirst({
    where: and(
      inArray(applications.id, unreviewedAssignedIds),
      eq(applications.isArchived, false)
    ),
    orderBy: [applications.uploadedAt],
  });

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
  try {
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
      try {
        const parsed = applicationCsvSchema.safeParse(row);
        if (!parsed.success) {
          results.errors.push(`Invalid row: ${JSON.stringify(row).substring(0, 100)}`);
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
          timestamp: parsed.data.timestamp || null,
          fullName: parsed.data.fullName,
          email: parsed.data.email,
          major: parsed.data.major || null,
          classStanding: parsed.data.classStanding || null,
          fridayAvailability: parsed.data.fridayAvailability || null,
          resumeUrl: parsed.data.resumeUrl || null,
          linkedinUrl: parsed.data.linkedinUrl || null,
          question1Response: parsed.data.question1Response || null,
          question2Response: parsed.data.question2Response || null,
          question3Response: parsed.data.question3Response || null,
          question4Response: parsed.data.question4Response || null,
          question5Response: parsed.data.question5Response || null,
          anythingElse: parsed.data.anythingElse || null,
          batchId,
        });

        results.success++;
      } catch (rowError) {
        const message = rowError instanceof Error ? rowError.message : 'Unknown error';
        results.errors.push(`Row error: ${message}`);
      }
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Upload error:', message);
    return { error: `Upload failed: ${message}` };
  }
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

export async function deleteApplication(id: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.delete(applications).where(eq(applications.id, id));

    await logAction('DELETE_APPLICATION', 'application', id);

    revalidatePath('/admin');
    revalidatePath('/results');
    revalidatePath('/review');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to delete application: ${message}` };
  }
}

export async function deleteAllApplications() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  try {
    await db.delete(applications);

    await logAction('DELETE_ALL_APPLICATIONS', 'application', undefined, {
      deletedBy: session.user.name || session.user.id,
    });

    revalidatePath('/admin');
    revalidatePath('/results');
    revalidatePath('/review');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to delete all applications: ${message}` };
  }
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
