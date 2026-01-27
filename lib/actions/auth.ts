'use server';

import { signIn, signOut } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { loginSchema } from '@/lib/validations';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
  const rawData = {
    username: formData.get('username'),
    password: formData.get('password'),
  };

  const parsed = loginSchema.safeParse(rawData);
  if (!parsed.success) {
    return { error: 'Invalid credentials' };
  }

  try {
    await signIn('credentials', {
      username: parsed.data.username,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { error: 'Invalid credentials' };
        default:
          return { error: 'Something went wrong' };
      }
    }
    throw error;
  }

  redirect('/review');
}

export async function logout() {
  await signOut({ redirect: false });
  redirect('/login');
}
