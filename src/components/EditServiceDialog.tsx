"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateService } from "@/actions";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Service } from "@/app/(app)/services/columns";

const formSchema = z.object({
  service: z.string().min(1, { message: "Service name is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  price: z.coerce
    .number()
    .positive({ message: "Price must be a positive number." }),
});

type EditServiceFormValues = z.infer<typeof formSchema>;

interface EditServiceDialogProps {
  service: Service;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditServiceDialog({
  service,
  isOpen,
  onOpenChange,
  onSuccess,
}: EditServiceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EditServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: service.service,
      category: service.category,
      price: service.price,
    },
  });

  async function onSubmit(values: EditServiceFormValues) {
    setIsSubmitting(true);

    try {
      const serviceFormData = new FormData();
      serviceFormData.append("id", String(service.id));
      serviceFormData.append("service", values.service);
      serviceFormData.append("category", values.category);
      serviceFormData.append("price", String(values.price));

      const result = await updateService(null, serviceFormData);

      if (result?.error) {
        toast.error("Service Update Failed", {
          description: result.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("Success", {
        description: "Service updated successfully.",
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error("Update Failed", {
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Service</DialogTitle>
          <DialogDescription>
            Make changes to the service details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="service"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Classic Manicure" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Nail Care" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 25.00" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
