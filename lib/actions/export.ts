'use server';

import { db, applications } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, desc } from 'drizzle-orm';
import { logAction } from './audit';

function escCsv(val: string) {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

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

  const filtered = isAdmin
    ? allApplications
    : allApplications.filter(app => app.reviews.length >= 2);

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
        reviewerDetails: '',
      };
    }

    const avgCollaboration = app.reviews.reduce((sum, r) => sum + r.collaborationScore, 0) / reviewCount;
    const avgCuriosity = app.reviews.reduce((sum, r) => sum + r.curiosityScore, 0) / reviewCount;
    const avgCommitment = app.reviews.reduce((sum, r) => sum + r.commitmentScore, 0) / reviewCount;
    const avgTotal = app.reviews.reduce((sum, r) => sum + r.totalScore, 0) / reviewCount;

    const reviewerDetails = app.reviews
      .map(r => `${r.reviewer.username}: Collab=${r.collaborationScore} Curiosity=${r.curiosityScore} Commit=${r.commitmentScore} Total=${r.totalScore}/12`)
      .join(' | ');

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
      reviewerDetails,
    };
  });

  results.sort((a, b) => {
    const aScore = parseFloat(a.avgTotal) || 0;
    const bScore = parseFloat(b.avgTotal) || 0;
    return bScore - aScore;
  });

  const headers = [
    'Rank',
    'Full Name',
    'Email',
    'Major',
    'Class Standing',
    'Review Count',
    'Avg Collaboration (/4)',
    'Avg Curiosity (/4)',
    'Avg Commitment (/4)',
    'Avg Total (/12)',
    'Reviewer Breakdown',
  ];

  const rows = results.map((r, i) => [
    String(i + 1),
    escCsv(r.fullName),
    escCsv(r.email),
    escCsv(r.major),
    escCsv(r.classStanding),
    String(r.reviewCount),
    r.avgCollaboration,
    r.avgCuriosity,
    r.avgCommitment,
    r.avgTotal,
    escCsv(r.reviewerDetails),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

  await logAction('EXPORT_RESULTS', 'export', undefined, {
    count: results.length,
  });

  return { csv };
}

export async function exportApplicantReport(applicationId: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: {
      reviews: {
        with: {
          reviewer: true,
        },
      },
    },
  });

  if (!app) {
    return { error: 'Application not found' };
  }

  const reviewCount = app.reviews.length;
  const lines: string[] = [];

  lines.push('=== VCA APPLICANT REPORT ===');
  lines.push('');
  lines.push(`Name:            ${app.fullName}`);
  lines.push(`Email:           ${app.email}`);
  lines.push(`Major:           ${app.major || 'N/A'}`);
  lines.push(`Class Standing:  ${app.classStanding || 'N/A'}`);
  lines.push(`Friday Avail:    ${app.fridayAvailability || 'N/A'}`);
  if (app.resumeUrl) lines.push(`Resume:          ${app.resumeUrl}`);
  if (app.linkedinUrl) lines.push(`LinkedIn:        ${app.linkedinUrl}`);
  lines.push('');

  lines.push('--- SCORES ---');
  lines.push(`Reviews Received: ${reviewCount}`);

  if (reviewCount > 0) {
    const avgCollab = app.reviews.reduce((s, r) => s + r.collaborationScore, 0) / reviewCount;
    const avgCuriosity = app.reviews.reduce((s, r) => s + r.curiosityScore, 0) / reviewCount;
    const avgCommitment = app.reviews.reduce((s, r) => s + r.commitmentScore, 0) / reviewCount;
    const avgTotal = app.reviews.reduce((s, r) => s + r.totalScore, 0) / reviewCount;

    lines.push(`Avg Collaboration: ${avgCollab.toFixed(2)} / 4`);
    lines.push(`Avg Curiosity:     ${avgCuriosity.toFixed(2)} / 4`);
    lines.push(`Avg Commitment:    ${avgCommitment.toFixed(2)} / 4`);
    lines.push(`Avg Total:         ${avgTotal.toFixed(2)} / 12`);
    lines.push('');

    lines.push('--- INDIVIDUAL REVIEWS ---');
    for (const r of app.reviews) {
      lines.push('');
      lines.push(`Reviewer: ${r.reviewer.username}`);
      lines.push(`  Collaboration: ${r.collaborationScore}/4`);
      lines.push(`  Curiosity:     ${r.curiosityScore}/4`);
      lines.push(`  Commitment:    ${r.commitmentScore}/4`);
      lines.push(`  Total:         ${r.totalScore}/12`);
      if (r.comments) {
        lines.push(`  Comments:      ${r.comments}`);
      }
      if (r.submittedAt) {
        lines.push(`  Submitted:     ${new Date(r.submittedAt).toLocaleString()}`);
      }
    }
  } else {
    lines.push('No reviews submitted yet.');
  }

  lines.push('');
  lines.push('--- RESPONSES ---');

  const questions = [
    { label: 'Q1: Where does VCA fit in your path?', value: app.question1Response },
    { label: 'Q2: Company or product you find fascinating?', value: app.question2Response },
    { label: 'Q3: Working with someone who disagreed?', value: app.question3Response },
    { label: 'Q4: Dinner with one founder?', value: app.question4Response },
    { label: 'Q5: One question to any founder?', value: app.question5Response },
    { label: 'Anything Else', value: app.anythingElse },
  ];

  for (const q of questions) {
    if (q.value) {
      lines.push('');
      lines.push(q.label);
      lines.push(q.value);
    }
  }

  lines.push('');
  lines.push(`Generated: ${new Date().toLocaleString()}`);

  await logAction('EXPORT_APPLICANT_REPORT', 'application', applicationId);

  return { report: lines.join('\n'), fileName: `${app.fullName.replace(/\s+/g, '_')}_report.txt` };
}
