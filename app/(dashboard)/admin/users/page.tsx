export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllUsers } from '@/lib/actions/users';
import { UserManagement } from '@/components/user-management';

export default async function UsersPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/review');
  }

  const result = await getAllUsers();

  if ('error' in result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage reviewers and administrators in the system.
        </p>
      </div>

      <UserManagement users={result.users || []} />
    </div>
  );
}
