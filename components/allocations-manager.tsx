'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { allocateApplications, getAllocations, reassignApplication } from '@/lib/actions/assignments';
import { Loader2, Shuffle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Allocation {
  application: { id: number; fullName: string; email: string };
  reviewers: { assignmentId: number; reviewerId: number; username: string }[];
}

interface Reviewer {
  id: number;
  username: string;
}

export function AllocationsManager() {
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAllocating, setIsAllocating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reassigning, setReassigning] = useState<number | null>(null);

  const loadAllocations = async () => {
    setIsLoading(true);
    const result = await getAllocations();
    if (!('error' in result)) {
      setAllocations(result.allocations);
      setReviewers(result.reviewers);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadAllocations();
  }, []);

  const handleAllocate = async () => {
    setIsAllocating(true);
    setMessage(null);
    const result = await allocateApplications();
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error as string });
    } else if ('success' in result) {
      setMessage({
        type: 'success',
        text: `Allocated ${result.totalApplications} applications (${result.totalAssignments} total assignments).`,
      });
      await loadAllocations();
    }
    setIsAllocating(false);
  };

  const handleReassign = async (assignmentId: number, newReviewerId: number) => {
    setReassigning(assignmentId);
    const result = await reassignApplication(assignmentId, newReviewerId);
    if ('error' in result) {
      setMessage({ type: 'error', text: result.error as string });
    } else {
      await loadAllocations();
      setMessage(null);
    }
    setReassigning(null);
  };

  // Compute per-reviewer counts
  const reviewerCounts: Record<number, number> = {};
  for (const alloc of allocations) {
    for (const r of alloc.reviewers) {
      reviewerCounts[r.reviewerId] = (reviewerCounts[r.reviewerId] || 0) + 1;
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Allocate Applications</CardTitle>
          <CardDescription>
            Distribute all applications equally among active reviewers. Each application will be assigned to exactly 2 reviewers.
            This will replace any existing allocations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isAllocating}>
                {isAllocating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="mr-2 h-4 w-4" />
                )}
                {allocations.length > 0 ? 'Re-allocate Applications' : 'Allocate Applications'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {allocations.length > 0 ? 'Re-allocate Applications?' : 'Allocate Applications?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {allocations.length > 0
                    ? 'This will clear all existing allocations and redistribute applications equally among active reviewers. Existing reviews will not be affected.'
                    : 'This will distribute all applications equally among active reviewers. Each application will be assigned to 2 reviewers.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleAllocate}>
                  {allocations.length > 0 ? 'Re-allocate' : 'Allocate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Reviewer summary */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Reviewer Load</CardTitle>
            <CardDescription>Number of applications assigned to each reviewer</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {reviewers.map(r => (
                <Badge key={r.id} variant="outline" className="text-sm px-3 py-1">
                  {r.username}: {reviewerCounts[r.id] || 0} apps
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Allocations table */}
      {allocations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Current Allocations</CardTitle>
            <CardDescription>
              {allocations.length} applications allocated. Click a reviewer to reassign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Reviewer 1</TableHead>
                    <TableHead>Reviewer 2</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allocations.map((alloc) => (
                    <TableRow key={alloc.application.id}>
                      <TableCell className="font-medium">{alloc.application.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{alloc.application.email}</TableCell>
                      {[0, 1].map((idx) => {
                        const reviewer = alloc.reviewers[idx];
                        if (!reviewer) {
                          return <TableCell key={idx} className="text-muted-foreground">Unassigned</TableCell>;
                        }
                        return (
                          <TableCell key={idx}>
                            <div className="flex items-center gap-2">
                              <Select
                                value={String(reviewer.reviewerId)}
                                onValueChange={(value) => handleReassign(reviewer.assignmentId, parseInt(value))}
                                disabled={reassigning === reviewer.assignmentId}
                              >
                                <SelectTrigger className="w-[160px]">
                                  {reassigning === reviewer.assignmentId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <SelectValue />
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  {reviewers.map((r) => (
                                    <SelectItem key={r.id} value={String(r.id)}>
                                      {r.username}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {allocations.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">
              No allocations yet. Click &quot;Allocate Applications&quot; to distribute applications among reviewers.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
