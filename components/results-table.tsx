'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Application, Review, User } from '@/lib/db/schema';
import { ArrowUpDown, Download, AlertTriangle, Trash2, FileDown } from 'lucide-react';
import { cn, getPercentileColor, calculatePercentile } from '@/lib/utils';
import { exportResultsToCsv, exportApplicantReport } from '@/lib/actions/export';
import { deleteApplication } from '@/lib/actions/applications';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { ApplicationReviewsModal } from '@/components/application-reviews-modal';

type ApplicationWithReviews = Application & {
  reviews: (Review & { reviewer: User })[];
};

interface ResultsTableProps {
  applications: ApplicationWithReviews[];
  showDiscrepancies?: boolean;
  isAdmin?: boolean;
}

type SortKey = 'name' | 'avgScore' | 'reviewCount';
type SortDirection = 'asc' | 'desc';

export function ResultsTable({ applications, showDiscrepancies = true, isAdmin = false }: ResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('avgScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [isExporting, setIsExporting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedApplicationName, setSelectedApplicationName] = useState('');

  const processedData = useMemo(() => {
    return applications.map((app) => {
      const reviewCount = app.reviews.length;

      if (reviewCount === 0) {
        return {
          ...app,
          avgScore: 0,
          avgCollaboration: 0,
          avgCuriosity: 0,
          avgCommitment: 0,
          hasDiscrepancy: false,
          discrepancyAmount: 0,
        };
      }

      const scores = app.reviews.map((r) => r.totalScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / reviewCount;
      const avgCollaboration = app.reviews.reduce((sum, r) => sum + r.collaborationScore, 0) / reviewCount;
      const avgCuriosity = app.reviews.reduce((sum, r) => sum + r.curiosityScore, 0) / reviewCount;
      const avgCommitment = app.reviews.reduce((sum, r) => sum + r.commitmentScore, 0) / reviewCount;

      // Calculate discrepancy
      const maxScore = Math.max(...scores);
      const minScore = Math.min(...scores);
      const discrepancyAmount = maxScore - minScore;
      const hasDiscrepancy = reviewCount >= 2 && discrepancyAmount >= 4;

      return {
        ...app,
        avgScore,
        avgCollaboration,
        avgCuriosity,
        avgCommitment,
        hasDiscrepancy,
        discrepancyAmount,
      };
    });
  }, [applications]);

  const sortedData = useMemo(() => {
    const sorted = [...processedData].sort((a, b) => {
      let comparison = 0;

      switch (sortKey) {
        case 'name':
          comparison = a.fullName.localeCompare(b.fullName);
          break;
        case 'avgScore':
          comparison = a.avgScore - b.avgScore;
          break;
        case 'reviewCount':
          comparison = a.reviews.length - b.reviews.length;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [processedData, sortKey, sortDirection]);

  const allScores = processedData
    .filter((d) => d.reviews.length > 0)
    .map((d) => d.avgScore);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportResultsToCsv();
      if ('csv' in result && result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vca-results-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setSelectedApplicationId(id);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedApplicationId) return;

    setIsDeleting(true);
    try {
      await deleteApplication(selectedApplicationId);
      setDeleteModalOpen(false);
      setSelectedApplicationId(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewReviews = (id: number, name: string) => {
    setSelectedApplicationId(id);
    setSelectedApplicationName(name);
    setReviewModalOpen(true);
  };

  const handleExportApplicant = async (id: number) => {
    const result = await exportApplicantReport(id);
    if ('report' in result && result.report) {
      const blob = new Blob([result.report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName || `applicant_${id}_report.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleExport} disabled={isExporting} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort('name')}
                    className="h-auto p-0 font-medium"
                  >
                    Applicant
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort('reviewCount')}
                    className="h-auto p-0 font-medium"
                  >
                    Reviews
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Collaboration</TableHead>
                <TableHead className="text-center">Curiosity</TableHead>
                <TableHead className="text-center">Commitment</TableHead>
                <TableHead className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => toggleSort('avgScore')}
                    className="h-auto p-0 font-medium"
                  >
                    Total
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                  </Button>
                </TableHead>
                {isAdmin && <TableHead className="text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.map((app, index) => {
                const percentile = app.reviews.length > 0
                  ? calculatePercentile(app.avgScore, allScores)
                  : 0;

                return (
                  <TableRow
                    key={app.id}
                    className={cn(
                      app.reviews.length > 0 && getPercentileColor(percentile),
                      app.hasDiscrepancy && showDiscrepancies && 'ring-2 ring-inset ring-yellow-500'
                    )}
                  >
                    <TableCell className="font-medium">
                      {sortKey === 'avgScore' && sortDirection === 'desc' ? index + 1 : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <button
                            onClick={() => handleViewReviews(app.id, app.fullName)}
                            className="font-medium hover:text-primary hover:underline text-left"
                          >
                            {app.fullName}
                          </button>
                        ) : (
                          <span className="font-medium">{`Applicant #${app.id}`}</span>
                        )}
                        {app.hasDiscrepancy && showDiscrepancies && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Score discrepancy: {app.discrepancyAmount} points
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {app.major}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant={app.reviews.length >= 2 ? 'default' : 'secondary'}>
                            {app.reviews.length}
                          </Badge>
                        </TooltipTrigger>
                        {app.reviews.length > 0 && isAdmin && (
                          <TooltipContent>
                            <div className="space-y-1">
                              {app.reviews.map((r) => (
                                <div key={r.id} className="flex justify-between gap-4">
                                  <span>{r.reviewer.username}:</span>
                                  <span className="font-medium">{r.totalScore}</span>
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-center">
                      {app.reviews.length > 0 ? app.avgCollaboration.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {app.reviews.length > 0 ? app.avgCuriosity.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {app.reviews.length > 0 ? app.avgCommitment.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-bold text-lg">
                        {app.reviews.length > 0 ? app.avgScore.toFixed(1) : '-'}
                      </span>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {app.reviews.length > 0 && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportApplicant(app.id)}
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Export report</TooltipContent>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(app.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <ConfirmationModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete Application"
          description={`Are you sure you want to delete this application? This will permanently remove the application and all associated reviews. This action cannot be undone.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete Application'}
          isLoading={isDeleting}
        />

        <ApplicationReviewsModal
          applicationId={selectedApplicationId}
          applicationName={selectedApplicationName}
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
        />
      </div>
    </TooltipProvider>
  );
}
