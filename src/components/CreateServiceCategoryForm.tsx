"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import {
  useActionState,
  startTransition,
  useState,
  useEffect,
} from "react";
import { upsertServiceCategory, getAvailableSortOrders, getExistingCategories } from "@/actions";
import { toast } from "sonner";

const formSchema = z.object({
  label: z.string()
    .transform((val) => val.replace(/<[^>]*>/g, "").trim())
    .pipe(
      z.string().min(2, { message: "Label must be at least 2 characters." })
    ),
  dbCategory: z.string()
    .transform((val) => val.replace(/<[^>]*>/g, "").trim())
    .pipe(
      z.string().min(2, { message: "DB Category must be at least 2 characters." })
    ),
  categoryKey: z.string().optional(),
  type: z.enum(["ExclusiveDropdown", "AddOnDropdown"]),
  column: z.enum(["left", "right", "full"]),
  sortOrder: z.coerce
    .number()
    .int({ message: "Sort order must be an integer" })
    .min(10, { message: "Sort order must be at least 10" })
    .max(100, { message: "Sort order must be at most 100" })
    .refine((val) => val % 10 === 0, {
      message: "Sort order must be a multiple of 10"
    }),
  dependsOn: z.string().optional(),
});

interface CreateServiceCategoryFormProps {
  onSuccess?: () => void;
}

const CreateServiceCategoryForm = ({ onSuccess }: CreateServiceCategoryFormProps) => {
  const [state, formAction, isPending] = useActionState<any, FormData>(
    upsertServiceCategory,
    undefined
  );
  const [availableSortOrders, setAvailableSortOrders] = useState<{
    left: number[];
    right: number[];
    full: number[];
  }>({ left: [], right: [], full: [] });
  const [existingCategories, setExistingCategories] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      label: "",
      dbCategory: "",
      categoryKey: "",
      type: undefined,
      column: undefined,
      sortOrder: undefined,
      dependsOn: "",
    },
  });

  const watchedColumn = form.watch("column");
  const watchedLabel = form.watch("label");
  const watchedDbCategory = form.watch("dbCategory");
  const watchedDependsOn = form.watch("dependsOn");

  // Load data on mount
  useEffect(() => {
    loadAvailableSortOrders();
    loadExistingCategories();
  }, []);

  // Update available sort orders when column changes
  useEffect(() => {
    if (watchedColumn) {
      const lowestOrder = availableSortOrders[watchedColumn]?.[0];
      if (lowestOrder) form.setValue("sortOrder", lowestOrder);
    }
  }, [watchedColumn, availableSortOrders, form]);

  // Auto-sync dbCategory from label and categoryKey based on dependsOn or dbCategory
  useEffect(() => {
    if (watchedLabel) {
      // Convert label to snake_case for dbCategory
      const dbCat = watchedLabel
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");

      form.setValue("dbCategory", dbCat);

      // If dependsOn is set, append "-Add" to it as categoryKey; otherwise use dbCategory
      if (watchedDependsOn) {
        form.setValue("categoryKey", `${watchedDependsOn}Add`);
      } else {
        form.setValue("categoryKey", dbCat);
      }
    }
  }, [watchedLabel, watchedDependsOn, form]);

  const loadAvailableSortOrders = async () => {
    try {
      const [leftOrders, rightOrders, fullOrders] = await Promise.all([
        getAvailableSortOrders("left"),
        getAvailableSortOrders("right"),
        getAvailableSortOrders("full"),
      ]);
      setAvailableSortOrders({
        left: leftOrders,
        right: rightOrders,
        full: fullOrders,
      });
    } catch (error) {
      console.error("Error loading available sort orders:", error);
    }
  };

  const loadExistingCategories = async () => {
    try {
      const categories = await getExistingCategories();
      setExistingCategories(categories || []);
    } catch (error) {
      console.error("Error loading existing categories:", error);
    }
  };

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      form.reset();
      loadAvailableSortOrders();
      onSuccess?.();
    } else if (state?.error) {
      toast.error("Creation Failed", { description: state.error });
    }
  }, [state, onSuccess]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="grid gap-4 px-4 max-h-[70vh] overflow-y-auto">
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Label</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Hair Services"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  Display name for this service category
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dbCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>DB Category</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., hair_services"
                    {...field}
                    disabled={true}
                  />
                </FormControl>
                <FormDescription>
                  Auto-generated from Label (read-only)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category Key</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., hair"
                    {...field}
                    disabled={true}
                  />
                </FormControl>
                <FormDescription>
                  Auto-generated from Label or Depends On (read-only)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
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
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
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
                  disabled={!watchedColumn || isPending}
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
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {existingCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select if this category depends on another service category. Category Key will automatically append "-Add" suffix.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Service Category"}
          </Button>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </form>
      </Form>
    </div>
  );
};

export default CreateServiceCategoryForm;
