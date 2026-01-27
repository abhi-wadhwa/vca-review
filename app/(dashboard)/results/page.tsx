export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { getAllApplicationsWithReviews } from '@/lib/actions/applications';
import { ResultsTable } from '@/components/results-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default async function ResultsPage() {
  let authSession = null;
  let isAdmin = false;
  let result: Awaited<ReturnType<typeof getAllApplicationsWithReviews>>;

  try {
    authSession = await auth();
    isAdmin = authSession?.user?.role === 'admin';
    result = await getAllApplicationsWithReviews();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">
          Failed to load results. {message}
        </p>
      </div>
    );
  }

  if ('error' in result) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">{result.error}</p>
      </div>
    );
  }

  const applications = result.applications || [];
  const fullyReviewed = applications.filter(app => app.reviews.length >= 2);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Results Dashboard</h1>
        <p className="text-muted-foreground">
          View and export applicant rankings based on reviewer scores.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Applications</CardDescription>
            <CardTitle className="text-3xl">{applications.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fully Reviewed (2+ reviews)</CardDescription>
            <CardTitle className="text-3xl">{fullyReviewed.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-3xl">
              {applications.length - fullyReviewed.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {!isAdmin && applications.length !== fullyReviewed.length && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="flex items-center gap-2 pt-4">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm">
              Only applications with 2 or more reviews are shown. Admins can see all applications.
            </span>
          </CardContent>
        </Card>
      )}

      {applications.length > 0 ? (
        <ResultsTable applications={applications} showDiscrepancies={isAdmin} isAdmin={isAdmin} />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">No applications have been reviewed yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
