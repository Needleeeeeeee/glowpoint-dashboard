"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  updateService,
  upsertServiceCategory,
  deleteServiceCategory,
  getAvailableSortOrders,
  getServiceCategories,
} from "@/actions";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Service } from "@/app/(app)/services/columns";

const formSchema = z.object({
  service: z.string().min(1, { message: "Service name is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  price: z.coerce
    .number()
    .positive({ message: "Price must be a positive number." }),
  // Service category options
  hasServiceCategory: z.boolean().default(false),
  type: z.enum(["ExclusiveDropdown", "AddOnDropdown"]).optional(),
  column: z.enum(["left", "right", "full"]).optional(),
  sortOrder: z.coerce
    .number()
    .int()
    .min(10)
    .max(100)
    .refine((val) => val % 10 === 0)
    .optional(),
  dependsOn: z.string().optional(),
})
  .refine(
    (data) => {
      if (data.hasServiceCategory) {
        return data.type && data.column && data.sortOrder;
      }
      return true;
    },
    {
      message: "Type, column, and sort order are required when service category is enabled",
      path: ["type"], // Path to associate the error with
    }
  );

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
  const [existingServiceCategory, setExistingServiceCategory] = useState<any>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [availableSortOrders, setAvailableSortOrders] = useState<{
    left: number[];
    right: number[];
    full: number[];
  }>({ left: [], right: [], full: [] });

  const form = useForm<EditServiceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: service.service,
      category: service.category,
      price: service.price,
      hasServiceCategory: false,
      type: undefined,
      column: undefined,
      sortOrder: undefined,
      dependsOn: "",
    },
  });

  const watchedColumn = form.watch("column");
  const watchedHasServiceCategory = form.watch("hasServiceCategory");

  // Load data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableSortOrders();
      loadServiceCategoryData();
    }
  }, [isOpen, service.id]);

  // Update available sort orders when column changes
  useEffect(() => {
    if (watchedColumn) {
      const lowestOrder = availableSortOrders[watchedColumn as keyof typeof availableSortOrders]?.[0];
      if (lowestOrder) form.setValue("sortOrder", lowestOrder);
    }
  }, [watchedColumn, availableSortOrders, form]);

  const loadAvailableSortOrders = async () => {
    try {
      const [left, right, full] = await Promise.all([
        getAvailableSortOrders("left"),
        getAvailableSortOrders("right"),
        getAvailableSortOrders("full"),
      ]);
      setAvailableSortOrders({ left, right, full });
    } catch (error) {
      console.error("Error loading sort orders:", error);
    }
  };

  const loadServiceCategoryData = async () => {
    try {
      // Load existing service category
      const serviceCategories = await getServiceCategories();
      const existingCategory = serviceCategories.find(
        (cat) => cat.db_category === service.category
      );

      if (existingCategory) {
        setExistingServiceCategory(existingCategory);
        form.setValue("hasServiceCategory", true);
        form.setValue("type", existingCategory.type);
        form.setValue("column", existingCategory.column);
        form.setValue("sortOrder", existingCategory.sort_order);
        form.setValue("dependsOn", existingCategory.depends_on || "");
      }

      // Load all services for depends_on dropdown
      // You might want to pass this as a prop or fetch it differently
      // setAllServices(allServicesData);
    } catch (error) {
      console.error("Error loading service category data:", error);
      toast.error("Failed to load service category data");
    }
  };

  async function onSubmit(values: EditServiceFormValues) {
    setIsSubmitting(true);

    try {
      // Update the service first
      const serviceFormData = new FormData();
      serviceFormData.append("id", String(service.id));
      serviceFormData.append("service", values.service);
      serviceFormData.append("category", values.category);
      serviceFormData.append("price", String(values.price));

      const serviceResult = await updateService(null, serviceFormData);

      if (serviceResult?.error) {
        toast.error("Service Update Failed", {
          description: serviceResult.error,
        });
        setIsSubmitting(false);
        return;
      }

      // If hasServiceCategory is now false, but one existed, try to delete it.
      // This must happen *after* the service is updated to potentially remove its category link.
      if (!values.hasServiceCategory && existingServiceCategory) {
        // If hasServiceCategory is false, but one existed, delete it.
        const deleteResult = await deleteServiceCategory(existingServiceCategory.id);
        if (deleteResult?.error) {
          // We show a warning here because the main service update was successful.
          // The category might not be deletable if other services still use it.
          toast.warning("Service updated, but category not removed", {
            description: deleteResult.error,
          });
        }
      }

      // If hasServiceCategory is true, upsert the category data.
      // This happens after the main service update to ensure consistency.
      if (values.hasServiceCategory && values.type && values.column && existingServiceCategory) {
        const categoryData = {
          db_category: existingServiceCategory.db_category,
          label: existingServiceCategory.label,
          category_key: existingServiceCategory.category_key,
          type: values.type,
          column: values.column,
          sort_order: values.sortOrder,
          depends_on: values.dependsOn,
        };

        const categoryResult = await upsertServiceCategory(null, categoryData);

        if (categoryResult?.error) {
          toast.error("Service Category Save Failed", {
            description: categoryResult.error,
          });
          // We don't return here because the main service update was successful.
        }
      }

      toast.success("Success", {
        description: "Service updated successfully.",
      });
      onSuccess();
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
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
                    <Input placeholder="e.g., Classic Manicure" {...field} />
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
                    <Input placeholder="e.g., Nail Care" {...field} />
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
                    <Input type="number" placeholder="e.g., 25.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Category Options */}
            <FormField
              control={form.control}
              name="hasServiceCategory"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Enable Service Category Options
                    </FormLabel>
                    <FormDescription>
                      Configure this service for dynamic dropdown display
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {watchedHasServiceCategory && (
              <>
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ExclusiveDropdown">Exclusive Dropdown</SelectItem>
                          <SelectItem value="AddOnDropdown">Add-On Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="column"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Column</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select column" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="full">Full</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        value={String(field.value || "")}
                        disabled={!watchedColumn}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sort order" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableSortOrders[watchedColumn as keyof typeof availableSortOrders]?.map(order => (
                            <SelectItem key={order} value={String(order)}>{order}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dependsOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Depends On (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., facials" {...field} />
                      </FormControl>
                      <FormDescription>
                        Specify if this service depends on another service category
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
