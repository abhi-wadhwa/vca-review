'use server';

import { db, users, reviews } from '@/lib/db';
import { auth } from '@/lib/auth';
import { eq, sql, desc } from 'drizzle-orm';
import { userSchema } from '@/lib/validations';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { generatePassword } from '@/lib/utils';
import { logAction } from './audit';

export async function getAllUsers() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });

  // Get review counts for each user
  const reviewCounts = await db
    .select({
      reviewerId: reviews.reviewerId,
      count: sql<number>`count(*)`,
    })
    .from(reviews)
    .groupBy(reviews.reviewerId);

  const countMap = new Map(reviewCounts.map(r => [r.reviewerId, Number(r.count)]));

  const usersWithCounts = allUsers.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
    reviewCount: countMap.get(user.id) || 0,
  }));

  return { users: usersWithCounts };
}

export async function createUser(data: unknown) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const parsed = userSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    const errorMessage = firstError?.message || 'Invalid data';
    return { error: errorMessage, details: parsed.error.issues };
  }

  // Check for existing username
  const existing = await db.query.users.findFirst({
    where: eq(users.username, parsed.data.username),
  });

  if (existing) {
    return { error: 'Username already exists' };
  }

  // Generate password if not provided
  const password = parsed.data.password || generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await db.insert(users).values({
    username: parsed.data.username,
    email: parsed.data.email || null,
    passwordHash,
    role: parsed.data.role,
    isActive: parsed.data.isActive,
  }).returning({ id: users.id });

  await logAction('CREATE_USER', 'user', result[0].id, {
    username: parsed.data.username,
    role: parsed.data.role,
  });

  revalidatePath('/admin/users');

  return {
    success: true,
    generatedPassword: parsed.data.password ? undefined : password,
    userId: result[0].id,
  };
}

export async function updateUser(id: number, data: unknown) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const parsed = userSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { error: 'Invalid data', details: parsed.error.issues };
  }

  const updateData: Record<string, unknown> = {};

  if (parsed.data.username) updateData.username = parsed.data.username;
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email || null;
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  if (parsed.data.password) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.password, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  await logAction('UPDATE_USER', 'user', id, {
    fields: Object.keys(updateData),
  });

  revalidatePath('/admin/users');

  return { success: true };
}

export async function deleteUser(id: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  // Prevent deleting own account
  if (parseInt(session.user.id) === id) {
    return { error: 'Cannot delete your own account' };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  await db.delete(users).where(eq(users.id, id));

  await logAction('DELETE_USER', 'user', id, {
    username: user?.username,
  });

  revalidatePath('/admin/users');

  return { success: true };
}

export async function resetUserPassword(id: number) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') {
    return { error: 'Unauthorized' };
  }

  const newPassword = generatePassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await db.update(users).set({ passwordHash }).where(eq(users.id, id));

  await logAction('RESET_PASSWORD', 'user', id);

  return { success: true, newPassword };
}
