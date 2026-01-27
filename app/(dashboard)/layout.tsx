import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { NavHeader } from '@/components/nav-header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-background">
      <NavHeader user={session.user} />
      <main className="container py-6">{children}</main>
    </div>
  );
}
