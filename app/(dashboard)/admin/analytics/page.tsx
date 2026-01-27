export const dynamic = 'force-dynamic';

import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  getReviewerAnalytics,
  getScoreDistribution,
  getOutlierReviews,
} from '@/lib/actions/analytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Target, TrendingUp } from 'lucide-react';

export default async function AnalyticsPage() {
  const session = await auth();

  if (session?.user?.role !== 'admin') {
    redirect('/review');
  }

  const [reviewerData, distributionData, outlierData] = await Promise.all([
    getReviewerAnalytics(),
    getScoreDistribution(),
    getOutlierReviews(),
  ]);

  if ('error' in reviewerData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-destructive">{reviewerData.error}</p>
      </div>
    );
  }

  const analytics = reviewerData.analytics || [];
  const distribution = ('distribution' in distributionData ? distributionData.distribution : []) || [];
  const outliers = ('outliers' in outlierData ? outlierData.outliers : []) || [];

  // Calculate overall stats
  const totalReviews = analytics.reduce((sum, r) => sum + r.totalReviews, 0);
  const avgTime = analytics.filter(r => r.averageTime > 0).length > 0
    ? analytics.reduce((sum, r) => sum + r.averageTime, 0) / analytics.filter(r => r.averageTime > 0).length
    : 0;
  const avgConsistency = analytics.filter(r => r.totalReviews > 0).length > 0
    ? analytics.filter(r => r.totalReviews > 0).reduce((sum, r) => sum + r.consistency, 0) / analytics.filter(r => r.totalReviews > 0).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Review performance metrics and insights.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reviews</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReviews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time/Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTime.toFixed(1)} min</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Consistency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConsistency.toFixed(0)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Reviewer Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reviewer Performance</CardTitle>
          <CardDescription>
            Individual reviewer statistics and metrics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reviewer</TableHead>
                <TableHead className="text-center">Reviews</TableHead>
                <TableHead className="text-center">Avg Score</TableHead>
                <TableHead className="text-center">Avg Time</TableHead>
                <TableHead className="text-center">Consistency</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.map((reviewer) => (
                <TableRow key={reviewer.id}>
                  <TableCell className="font-medium">{reviewer.username}</TableCell>
                  <TableCell className="text-center">{reviewer.totalReviews}</TableCell>
                  <TableCell className="text-center">
                    {reviewer.totalReviews > 0 ? reviewer.averageScore.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {reviewer.averageTime > 0 ? `${reviewer.averageTime.toFixed(1)} min` : '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {reviewer.totalReviews > 0 ? (
                      <Badge
                        variant={
                          reviewer.consistency >= 80
                            ? 'success'
                            : reviewer.consistency >= 60
                            ? 'secondary'
                            : 'warning'
                        }
                      >
                        {reviewer.consistency}%
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={reviewer.isActive ? 'default' : 'secondary'}>
                      {reviewer.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Score Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Score Distribution</CardTitle>
          <CardDescription>
            Distribution of total scores across all reviews.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((score) => {
              const count = distribution.find((d) => d.totalScore === score)?.count || 0;
              const maxCount = Math.max(...distribution.map((d) => Number(d.count)), 1);
              const percentage = (Number(count) / maxCount) * 100;

              return (
                <div key={score} className="flex items-center gap-2">
                  <div className="w-8 text-sm text-right text-muted-foreground">{score}</div>
                  <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-12 text-sm text-muted-foreground">{count}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Outlier Reviews */}
      {outliers.length > 0 && (
        <Card className="border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Score Discrepancies
            </CardTitle>
            <CardDescription>
              Reviews with scores significantly different from other reviewers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center">Other Scores</TableHead>
                  <TableHead className="text-center">Deviation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outliers.slice(0, 10).map((outlier, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{outlier.applicantName}</TableCell>
                    <TableCell>{outlier.reviewerName}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="destructive">{outlier.score}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {outlier.otherScores.join(', ')}
                    </TableCell>
                    <TableCell className="text-center">
                      {outlier.deviation.toFixed(1)} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
