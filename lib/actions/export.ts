'use server';

import { db, applications } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { logAction } from './audit';

export async function exportResultsToCsv() {
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

  // Filter to only show fully reviewed applications for non-admins
  const filtered = isAdmin
    ? allApplications
    : allApplications.filter(app => app.reviews.length >= 2);

  // Calculate average scores and rankings
  const results = filtered.map(app => {
    const reviewCount = app.reviews.length;

    if (reviewCount === 0) {
      return {
        fullName: app.fullName,
        email: app.email,
        major: app.major || '',
        classStanding: app.classStanding || '',
        reviewCount: 0,
        avgCollaboration: '',
        avgCuriosity: '',
        avgCommitment: '',
        avgTotal: '',
        reviewerScores: '',
      };
    }

    const avgCollaboration = app.reviews.reduce((sum, r) => sum + r.collaborationScore, 0) / reviewCount;
    const avgCuriosity = app.reviews.reduce((sum, r) => sum + r.curiosityScore, 0) / reviewCount;
    const avgCommitment = app.reviews.reduce((sum, r) => sum + r.commitmentScore, 0) / reviewCount;
    const avgTotal = app.reviews.reduce((sum, r) => sum + r.totalScore, 0) / reviewCount;

    const reviewerScores = app.reviews
      .map(r => `${r.reviewer.username}:${r.totalScore}`)
      .join('; ');

    return {
      fullName: app.fullName,
      email: app.email,
      major: app.major || '',
      classStanding: app.classStanding || '',
      reviewCount,
      avgCollaboration: avgCollaboration.toFixed(2),
      avgCuriosity: avgCuriosity.toFixed(2),
      avgCommitment: avgCommitment.toFixed(2),
      avgTotal: avgTotal.toFixed(2),
      reviewerScores,
    };
  });

  // Sort by average total score descending
  results.sort((a, b) => {
    const aScore = parseFloat(a.avgTotal) || 0;
    const bScore = parseFloat(b.avgTotal) || 0;
    return bScore - aScore;
  });

  // Create CSV
  const headers = [
    'Rank',
    'Full Name',
    'Email',
    'Major',
    'Class Standing',
    'Review Count',
    'Avg Collaboration',
    'Avg Curiosity',
    'Avg Commitment',
    'Avg Total',
    'Reviewer Scores',
  ];

  const rows = results.map((r, i) => [
    i + 1,
    `"${r.fullName}"`,
    `"${r.email}"`,
    `"${r.major}"`,
    `"${r.classStanding}"`,
    r.reviewCount,
    r.avgCollaboration,
    r.avgCuriosity,
    r.avgCommitment,
    r.avgTotal,
    `"${r.reviewerScores}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  await logAction('EXPORT_RESULTS', 'export', undefined, {
    count: results.length,
  });

  return { csv };
}
