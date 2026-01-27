'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { deleteAllApplications } from '@/lib/actions/applications';
import { Trash2 } from 'lucide-react';

export function ClearAllButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await deleteAllApplications();
      setIsOpen(false);
      window.location.reload();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Clear All Applications
      </Button>

      <ConfirmationModal
        open={isOpen}
        onOpenChange={setIsOpen}
        onConfirm={handleConfirm}
        title="Clear All Applications"
        description="Are you sure you want to delete ALL applications and their reviews? This will permanently remove all data and cannot be undone. This action is irreversible."
        confirmText={isDeleting ? 'Deleting...' : 'Delete All Applications'}
        isLoading={isDeleting}
      />
    </>
  );
}
