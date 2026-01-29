'use server';

import { db, assignments, applications, users, reviews } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { logAction } from './audit';

export async function allocateApplications() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Get all active reviewers
  const activeReviewers = await db.query.users.findMany({
    where: and(eq(users.role, 'reviewer'), eq(users.isActive, true)),
  });

  if (activeReviewers.length < 2) {
    return { error: 'Need at least 2 active reviewers to allocate applications' };
  }

  // Get all non-archived applications
  const allApps = await db.query.applications.findMany({
    where: eq(applications.isArchived, false),
    orderBy: [applications.uploadedAt],
  });

  if (allApps.length === 0) {
    return { error: 'No applications to allocate' };
  }

  // Clear existing assignments
  await db.delete(assignments);

  // Each application needs exactly 2 reviewers.
  // Distribute as evenly as possible among all reviewers.
  const reviewerCount = activeReviewers.length;
  // Total assignment slots = apps * 2, divided among reviewers
  const totalSlots = allApps.length * 2;
  const basePerReviewer = Math.floor(totalSlots / reviewerCount);
  const remainder = totalSlots % reviewerCount;

  // Build a quota for each reviewer
  const reviewerQuotas = activeReviewers.map((r, i) => ({
    id: r.id,
    quota: basePerReviewer + (i < remainder ? 1 : 0),
    assigned: 0,
  }));

  // Assign 2 reviewers per application using round-robin
  const assignmentValues: { applicationId: number; reviewerId: number }[] = [];
  let reviewerIndex = 0;

  for (const app of allApps) {
    const assignedReviewers: number[] = [];
    let attempts = 0;

    while (assignedReviewers.length < 2 && attempts < reviewerCount * 2) {
      const reviewer = reviewerQuotas[reviewerIndex % reviewerCount];
      if (!assignedReviewers.includes(reviewer.id) && reviewer.assigned < reviewer.quota) {
        assignedReviewers.push(reviewer.id);
        reviewer.assigned++;
        assignmentValues.push({
          applicationId: app.id,
          reviewerId: reviewer.id,
        });
      }
      reviewerIndex = (reviewerIndex + 1) % reviewerCount;
      attempts++;
    }

    // Fallback: if round-robin couldn't fill 2, pick any reviewer not yet assigned
    if (assignedReviewers.length < 2) {
      for (const reviewer of reviewerQuotas) {
        if (!assignedReviewers.includes(reviewer.id)) {
          assignedReviewers.push(reviewer.id);
          reviewer.assigned++;
          assignmentValues.push({
            applicationId: app.id,
            reviewerId: reviewer.id,
          });
          if (assignedReviewers.length >= 2) break;
        }
      }
    }
  }

  // Batch insert assignments
  if (assignmentValues.length > 0) {
    await db.insert(assignments).values(assignmentValues);
  }

  await logAction('ALLOCATE_APPLICATIONS', 'assignment', undefined, {
    totalApplications: allApps.length,
    totalAssignments: assignmentValues.length,
    reviewerCount,
  });

  revalidatePath('/admin');
  revalidatePath('/admin/allocations');
  revalidatePath('/review');

  return {
    success: true,
    totalApplications: allApps.length,
    totalAssignments: assignmentValues.length,
  };
}

export async function getAllocations() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const allAssignments = await db.query.assignments.findMany({
    with: {
      application: true,
      reviewer: true,
    },
  });

  // Group by application
  const grouped: Record<number, {
    application: { id: number; fullName: string; email: string };
    reviewers: { assignmentId: number; reviewerId: number; username: string }[];
  }> = {};

  for (const a of allAssignments) {
    if (!grouped[a.applicationId]) {
      grouped[a.applicationId] = {
        application: {
          id: a.application.id,
          fullName: a.application.fullName,
          email: a.application.email,
        },
        reviewers: [],
      };
    }
    grouped[a.applicationId].reviewers.push({
      assignmentId: a.id,
      reviewerId: a.reviewer.id,
      username: a.reviewer.username,
    });
  }

  // Get active reviewers for the reassignment dropdown
  const activeReviewers = await db.query.users.findMany({
    where: and(eq(users.role, 'reviewer'), eq(users.isActive, true)),
  });

  return {
    allocations: Object.values(grouped),
    reviewers: activeReviewers.map(r => ({ id: r.id, username: r.username })),
  };
}

export async function reassignApplication(assignmentId: number, newReviewerId: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Get current assignment
  const current = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  });

  if (!current) {
    return { error: 'Assignment not found' };
  }

  // Check the new reviewer isn't already assigned to this application
  const existing = await db.query.assignments.findFirst({
    where: and(
      eq(assignments.applicationId, current.applicationId),
      eq(assignments.reviewerId, newReviewerId),
    ),
  });

  if (existing) {
    return { error: 'This reviewer is already assigned to this application' };
  }

  await db
    .update(assignments)
    .set({ reviewerId: newReviewerId, assignedAt: new Date() })
    .where(eq(assignments.id, assignmentId));

  await logAction('REASSIGN_APPLICATION', 'assignment', assignmentId, {
    applicationId: current.applicationId,
    oldReviewerId: current.reviewerId,
    newReviewerId,
  });

  revalidatePath('/admin/allocations');
  revalidatePath('/review');

  return { success: true };
}

export async function getMyAssignmentCount() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const reviewerId = parseInt(session.user.id);

  const myAssignments = await db.query.assignments.findMany({
    where: eq(assignments.reviewerId, reviewerId),
  });

  // Check how many have been completed
  const completedReviews = await db.query.reviews.findMany({
    where: eq(reviews.reviewerId, reviewerId),
  });

  const completedAppIds = new Set(completedReviews.map(r => r.applicationId));
  const remaining = myAssignments.filter(a => !completedAppIds.has(a.applicationId)).length;

  return {
    total: myAssignments.length,
    completed: myAssignments.length - remaining,
    remaining,
  };
}
