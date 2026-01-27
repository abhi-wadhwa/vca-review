'use server';

import { db, reviews, draftReviews } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { reviewSchema, draftReviewSchema } from '@/lib/validations';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

export async function saveDraft(data: unknown) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const parsed = draftReviewSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues };
  }

  const reviewerId = parseInt(session.user.id);
  const { applicationId, ...draftData } = parsed.data;

  // Upsert draft
  const existing = await db.query.draftReviews.findFirst({
    where: and(
      eq(draftReviews.applicationId, applicationId),
      eq(draftReviews.reviewerId, reviewerId)
    ),
  });

  if (existing) {
    await db
      .update(draftReviews)
      .set({
        ...draftData,
        updatedAt: new Date(),
      })
      .where(eq(draftReviews.id, existing.id));
  } else {
    await db.insert(draftReviews).values({
      applicationId,
      reviewerId,
      ...draftData,
    });
  }

  return { success: true };
}

export async function submitReview(data: unknown, startedAt?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const parsed = reviewSchema.safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues };
  }

  const reviewerId = parseInt(session.user.id);
  const { applicationId, initiativeScore, collaborationScore, curiosityScore, commitmentScore, comments } = parsed.data;

  // Check if already reviewed
  const existing = await db.query.reviews.findFirst({
    where: and(
      eq(reviews.applicationId, applicationId),
      eq(reviews.reviewerId, reviewerId)
    ),
  });

  if (existing) {
    return { error: 'You have already reviewed this application' };
  }

  const totalScore = initiativeScore + collaborationScore + curiosityScore + commitmentScore;

  await db.insert(reviews).values({
    applicationId,
    reviewerId,
    initiativeScore,
    collaborationScore,
    curiosityScore,
    commitmentScore,
    totalScore,
    comments: comments || null,
    startedAt: startedAt ? new Date(startedAt) : null,
    submittedAt: new Date(),
  });

  // Delete draft if exists
  await db
    .delete(draftReviews)
    .where(
      and(
        eq(draftReviews.applicationId, applicationId),
        eq(draftReviews.reviewerId, reviewerId)
      )
    );

  await logAction('SUBMIT_REVIEW', 'review', applicationId, {
    totalScore,
    reviewerId,
  });

  revalidatePath('/review');
  revalidatePath('/results');
  revalidatePath('/admin');

  return { success: true };
}

export async function getReviewProgress() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const reviewerId = parseInt(session.user.id);

  const userReviews = await db.query.reviews.findMany({
    where: eq(reviews.reviewerId, reviewerId),
  });

  return {
    completed: userReviews.length,
  };
}

export async function getReviewsByApplication(applicationId: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  // Only admins can see individual reviews
  if (session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const applicationReviews = await db.query.reviews.findMany({
    where: eq(reviews.applicationId, applicationId),
    with: {
      reviewer: true,
    },
  });

  return { reviews: applicationReviews };
}

export async function updateReview(reviewId: number, data: {
  initiativeScore: number;
  collaborationScore: number;
  curiosityScore: number;
  commitmentScore: number;
  comments?: string;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const totalScore = data.initiativeScore + data.collaborationScore + data.curiosityScore + data.commitmentScore;

  try {
    await db
      .update(reviews)
      .set({
        initiativeScore: data.initiativeScore,
        collaborationScore: data.collaborationScore,
        curiosityScore: data.curiosityScore,
        commitmentScore: data.commitmentScore,
        totalScore,
        comments: data.comments || null,
      })
      .where(eq(reviews.id, reviewId));

    await logAction('UPDATE_REVIEW', 'review', reviewId, {
      totalScore,
    });

    revalidatePath('/results');
    revalidatePath('/admin');

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { error: `Failed to update review: ${message}` };
  }
}
