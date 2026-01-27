'use server';

import { db, reviews, users, applications } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, sql, and } from 'drizzle-orm';
import { calculateStandardDeviation, isOutlierScore } from '@/lib/utils';

export async function getReviewerAnalytics() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const reviewers = await db.query.users.findMany({
    where: eq(users.role, 'reviewer'),
    with: {
      reviews: true,
    },
  });

  const analytics = reviewers.map(reviewer => {
    const reviewerReviews = reviewer.reviews;
    const totalReviews = reviewerReviews.length;

    if (totalReviews === 0) {
      return {
        id: reviewer.id,
        username: reviewer.username,
        totalReviews: 0,
        averageScore: 0,
        averageTime: 0,
        consistency: 0,
        isActive: reviewer.isActive,
      };
    }

    // Average score
    const scores = reviewerReviews.map(r => r.totalScore);
    const averageScore = scores.reduce((a, b) => a + b, 0) / totalReviews;

    // Consistency (inverse of standard deviation, normalized)
    const stdDev = calculateStandardDeviation(scores);
    const consistency = Math.max(0, 100 - stdDev * 10);

    // Average time per review
    const reviewsWithTime = reviewerReviews.filter(r => r.startedAt && r.submittedAt);
    let averageTime = 0;
    if (reviewsWithTime.length > 0) {
      const times = reviewsWithTime.map(r => {
        const start = new Date(r.startedAt!).getTime();
        const end = new Date(r.submittedAt!).getTime();
        return (end - start) / 1000 / 60; // minutes
      });
      averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    }

    return {
      id: reviewer.id,
      username: reviewer.username,
      totalReviews,
      averageScore: Math.round(averageScore * 100) / 100,
      averageTime: Math.round(averageTime * 10) / 10,
      consistency: Math.round(consistency),
      isActive: reviewer.isActive,
    };
  });

  return { analytics };
}

export async function getScoreDistribution() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const distribution = await db
    .select({
      totalScore: reviews.totalScore,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .groupBy(reviews.totalScore)
    .orderBy(reviews.totalScore);

  return { distribution };
}

export async function getOutlierReviews() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Get all applications with their reviews
  const applicationsWithReviews = await db.query.applications.findMany({
    where: eq(applications.isArchived, false),
    with: {
      reviews: {
        with: {
          reviewer: true,
        },
      },
    },
  });

  const outliers: Array<{
    applicationId: number;
    applicantName: string;
    reviewerName: string;
    score: number;
    otherScores: number[];
    deviation: number;
  }> = [];

  for (const app of applicationsWithReviews) {
    if (app.reviews.length < 2) continue;

    const scores = app.reviews.map(r => r.totalScore);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const stdDev = calculateStandardDeviation(scores);

    if (stdDev < 2) continue; // Not enough variance to have outliers

    for (const review of app.reviews) {
      if (isOutlierScore(review.totalScore, mean, stdDev)) {
        outliers.push({
          applicationId: app.id,
          applicantName: app.fullName,
          reviewerName: review.reviewer.username,
          score: review.totalScore,
          otherScores: scores.filter(s => s !== review.totalScore),
          deviation: Math.abs(review.totalScore - mean),
        });
      }
    }
  }

  return { outliers: outliers.sort((a, b) => b.deviation - a.deviation) };
}

export async function getOverallStats() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const totalAppsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.isArchived, false));

  const totalReviewsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews);

  const fullyReviewedResult = await db
    .select({
      applicationId: reviews.applicationId,
      count: sql<number>`count(*)`
    })
    .from(reviews)
    .groupBy(reviews.applicationId);

  const fullyReviewed = fullyReviewedResult.filter(r => Number(r.count) >= 2).length;

  const activeReviewersResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(and(eq(users.role, 'reviewer'), eq(users.isActive, true)));

  return {
    totalApplications: Number(totalAppsResult[0]?.count) || 0,
    totalReviews: Number(totalReviewsResult[0]?.count) || 0,
    fullyReviewed,
    activeReviewers: Number(activeReviewersResult[0]?.count) || 0,
  };
}
