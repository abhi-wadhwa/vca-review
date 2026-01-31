'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getReviewsByApplication, updateReview } from '@/lib/actions/reviews';
import { getApplicationById } from '@/lib/actions/applications';
import { Loader2, Save } from 'lucide-react';
import { Review, User, Application } from '@/lib/db/schema';
import { ApplicationCard } from '@/components/application-card';

interface ApplicationReviewsModalProps {
  applicationId: number | null;
  applicationName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ReviewWithReviewer = Review & { reviewer: User };

export function ApplicationReviewsModal({
  applicationId,
  applicationName,
  open,
  onOpenChange,
}: ApplicationReviewsModalProps) {
  const [reviews, setReviews] = useState<ReviewWithReviewer[]>([]);
  const [application, setApplication] = useState<Application | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [editingReview, setEditingReview] = useState<number | null>(null);
  const [editData, setEditData] = useState<{
    collaborationScore: number;
    curiosityScore: number;
    commitmentScore: number;
    comments: string;
  }>({
    collaborationScore: 1,
    curiosityScore: 1,
    commitmentScore: 1,
    comments: '',
  });

  const loadReviews = useCallback(async () => {
    if (!applicationId) return;

    setIsLoading(true);
    const [reviewsResult, appResult] = await Promise.all([
      getReviewsByApplication(applicationId),
      getApplicationById(applicationId),
    ]);
    if ('reviews' in reviewsResult && reviewsResult.reviews) {
      setReviews(reviewsResult.reviews);
    }
    if ('application' in appResult && appResult.application) {
      setApplication(appResult.application);
    }
    setIsLoading(false);
  }, [applicationId]);

  useEffect(() => {
    if (applicationId && open) {
      loadReviews();
    }
  }, [applicationId, open, loadReviews]);

  const handleEdit = (review: ReviewWithReviewer) => {
    setEditingReview(review.id);
    setEditData({
      collaborationScore: review.collaborationScore,
      curiosityScore: review.curiosityScore,
      commitmentScore: review.commitmentScore,
      comments: review.comments || '',
    });
  };

  const handleSave = async (reviewId: number) => {
    await updateReview(reviewId, editData);
    setEditingReview(null);
    loadReviews();
  };

  const totalScore =
    editData.collaborationScore +
    editData.curiosityScore +
    editData.commitmentScore;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reviews for {applicationName}</DialogTitle>
          <DialogDescription>
            View and edit individual reviewer scores
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {application && (
              <ApplicationCard application={application} isAdmin />
            )}

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No reviews yet for this application.
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Reviews</h3>
                {reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {review.reviewer.username}
                    </CardTitle>
                    {editingReview === review.id ? (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingReview(null)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => handleSave(review.id)}>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => handleEdit(review)}>
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingReview === review.id ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Collaboration (1-4)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            value={editData.collaborationScore}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                collaborationScore: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Curiosity (1-4)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            value={editData.curiosityScore}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                curiosityScore: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Commitment (1-4)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="4"
                            value={editData.commitmentScore}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                commitmentScore: parseInt(e.target.value) || 1,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Comments</Label>
                        <Textarea
                          value={editData.comments}
                          onChange={(e) =>
                            setEditData({ ...editData, comments: e.target.value })
                          }
                          rows={3}
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Total Score: <span className="font-bold">{totalScore}/12</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Collaboration:</span>{' '}
                          <span className="font-medium">{review.collaborationScore}/4</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Curiosity:</span>{' '}
                          <span className="font-medium">{review.curiosityScore}/4</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Commitment:</span>{' '}
                          <span className="font-medium">{review.commitmentScore}/4</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Total Score:</span>{' '}
                        <span className="font-bold text-lg">{review.totalScore}/12</span>
                      </div>
                      {review.comments && (
                        <div className="pt-2">
                          <span className="text-sm text-muted-foreground">Comments:</span>
                          <p className="mt-1 text-sm bg-muted p-2 rounded">
                            {review.comments}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
