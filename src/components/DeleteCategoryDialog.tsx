"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getServiceCategories, deleteServiceCategory } from "@/actions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ServiceCategory {
  id: number;
  label: string;
  db_category: string;
}

interface DeleteCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DeleteCategoryDialog({ isOpen, onOpenChange, onSuccess }: DeleteCategoryDialogProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      async function fetchCategories() {
        const fetchedCategories = await getServiceCategories();
        setCategories(fetchedCategories);
      }
      fetchCategories();
    }
  }, [isOpen]);

  const handleDelete = async () => {
    if (!selectedCategoryId) return;

    setIsDeleting(true);
    const result = await deleteServiceCategory(selectedCategoryId);

    if (result.error) {
      toast.error("Delete Failed", { description: result.error });
    } else {
      toast.success("Success", { description: result.success });
      onSuccess();
      setSelectedCategoryId(null);
    }

    setIsDeleting(false);
    setIsConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Category</DialogTitle>
            <DialogDescription>Select a category to delete. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <Select onValueChange={(value) => setSelectedCategoryId(Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="destructive" onClick={() => setIsConfirmOpen(true)} disabled={!selectedCategoryId}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the service category.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
