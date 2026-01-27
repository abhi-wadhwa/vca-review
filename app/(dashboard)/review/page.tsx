'use client';

import { useState, useEffect, useCallback } from 'react';
import { ApplicationCard } from '@/components/application-card';
import { RatingSlider } from '@/components/rating-slider';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { getNextUnreviewedApplication, getApplicationStats } from '@/lib/actions/applications';
import { saveDraft, submitReview, getReviewProgress } from '@/lib/actions/reviews';
import { Application } from '@/lib/db/schema';
import { Loader2, CheckCircle, Send } from 'lucide-react';

interface ReviewState {
  initiativeScore?: number;
  collaborationScore?: number;
  curiosityScore?: number;
  commitmentScore?: number;
  comments: string;
}

export default function ReviewPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>({ comments: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0, pending: 0 });

  const loadNextApplication = useCallback(async () => {
    setIsLoading(true);
    const result = await getNextUnreviewedApplication();

    if ('completed' in result && result.completed) {
      setCompleted(true);
      setApplication(null);
    } else if ('application' in result && result.application) {
      setApplication(result.application);
      setStartedAt(new Date().toISOString());

      // Load draft if exists
      if ('draft' in result && result.draft) {
        setReviewState({
          initiativeScore: result.draft.initiativeScore ?? undefined,
          collaborationScore: result.draft.collaborationScore ?? undefined,
          curiosityScore: result.draft.curiosityScore ?? undefined,
          commitmentScore: result.draft.commitmentScore ?? undefined,
          comments: result.draft.comments || '',
        });
      } else {
        setReviewState({ comments: '' });
      }
    }

    // Load stats
    const stats = await getApplicationStats();
    if (!('error' in stats)) {
      setProgress({ completed: stats.reviewed, total: stats.total, pending: stats.pending });
    }

    const reviewProgress = await getReviewProgress();
    if (!('error' in reviewProgress)) {
      setProgress(p => ({ ...p, completed: reviewProgress.completed }));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadNextApplication();
  }, [loadNextApplication]);

  // Auto-save draft
  useEffect(() => {
    if (!application) return;

    const timeoutId = setTimeout(async () => {
      await saveDraft({
        applicationId: application.id,
        ...reviewState,
      });
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [reviewState, application]);

  const handleScoreChange = (field: keyof ReviewState) => (value: number | undefined) => {
    setReviewState(prev => ({ ...prev, [field]: value }));
  };

  const isFormComplete =
    reviewState.initiativeScore !== undefined &&
    reviewState.collaborationScore !== undefined &&
    reviewState.curiosityScore !== undefined &&
    reviewState.commitmentScore !== undefined;

  const totalScore =
    (reviewState.initiativeScore || 0) +
    (reviewState.collaborationScore || 0) +
    (reviewState.curiosityScore || 0) +
    (reviewState.commitmentScore || 0);

  const handleSubmit = async () => {
    if (!application || !isFormComplete) return;

    setIsSubmitting(true);
    const result = await submitReview(
      {
        applicationId: application.id,
        initiativeScore: reviewState.initiativeScore!,
        collaborationScore: reviewState.collaborationScore!,
        curiosityScore: reviewState.curiosityScore!,
        commitmentScore: reviewState.commitmentScore!,
        comments: reviewState.comments,
      },
      startedAt || undefined
    );

    if ('success' in result) {
      setShowConfirmModal(false);
      await loadNextApplication();
    }

    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">All Done!</h1>
        <p className="text-muted-foreground">
          You have reviewed all available applications. Check back later for more.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Total reviews completed: {progress.completed}
        </p>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No applications available for review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Your reviews: {progress.completed}</span>
        <span>Remaining applications: {progress.pending}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Application Details */}
        <div>
          <ApplicationCard application={application} />
        </div>

        {/* Rating Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Your Review</span>
                <span className="text-2xl font-bold text-primary">
                  {isFormComplete ? totalScore : '--'} / 16
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <RatingSlider
                label="Initiative"
                description="Self-starter, proactive, takes ownership"
                value={reviewState.initiativeScore}
                onChange={handleScoreChange('initiativeScore')}
              />

              <RatingSlider
                label="Collaboration"
                description="Team player, communication skills, empathy"
                value={reviewState.collaborationScore}
                onChange={handleScoreChange('collaborationScore')}
              />

              <RatingSlider
                label="Curiosity"
                description="Eager to learn, asks questions, explores"
                value={reviewState.curiosityScore}
                onChange={handleScoreChange('curiosityScore')}
              />

              <RatingSlider
                label="Commitment"
                description="Dedicated, reliable, follows through"
                value={reviewState.commitmentScore}
                onChange={handleScoreChange('commitmentScore')}
              />

              <div className="space-y-2">
                <Label htmlFor="comments">Comments (optional)</Label>
                <Textarea
                  id="comments"
                  placeholder="Add any additional notes about this applicant..."
                  value={reviewState.comments}
                  onChange={(e) => setReviewState(prev => ({ ...prev, comments: e.target.value }))}
                  rows={4}
                />
              </div>

              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={!isFormComplete}
                className="w-full"
                size="lg"
              >
                <Send className="mr-2 h-4 w-4" />
                Submit Review
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                Your progress is automatically saved as a draft.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmationModal
        open={showConfirmModal}
        onOpenChange={setShowConfirmModal}
        onConfirm={handleSubmit}
        title="Submit Review"
        description={`Are you sure you want to submit your review for ${application.fullName}? Total score: ${totalScore}/16. This action cannot be undone.`}
        confirmText={isSubmitting ? 'Submitting...' : 'Submit Review'}
        isLoading={isSubmitting}
      />
    </div>
  );
}
