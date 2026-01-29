export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AllocationsManager } from '@/components/allocations-manager';

export default async function AllocationsPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/review');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Application Allocations</h1>
        <p className="text-muted-foreground">
          Distribute applications equally among reviewers and manage assignments.
        </p>
      </div>
      <AllocationsManager />
    </div>
  );
}
