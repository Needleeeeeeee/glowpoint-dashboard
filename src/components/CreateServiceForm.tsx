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
import { Checkbox } from "./ui/checkbox";
import {
  useActionState,
  startTransition,
  useState,
  useEffect,
} from "react";
import { createService, getAvailableSortOrders } from "@/actions";
import { toast } from "sonner";

const formSchema = z
  .object({
    service: z.string()
      .transform((val) => val.replace(/<[^>]*>/g, "").trim())
      .pipe(
        z.string().min(2, { message: "Service name must be at least 2 characters." })
      ),
    price: z.coerce.number({ message: "Price must be a number." })
      .min(0, { message: "Price must be a positive number." }),
    category: z.string().min(1, { message: "Category is required." }),
    newCategory: z.string()
      .transform((val) => val.replace(/<[^>]*>/g, "").trim())
      .optional(),
    // Service category options
    hasServiceCategory: z.boolean().default(false),
    type: z.enum(["ExclusiveDropdown", "AddOnDropdown"]).optional(),
    column: z.enum(["left", "right", "full"]).optional(),
    sortOrder: z.coerce
      .number()
      .int({ message: "Sort order must be an integer" })
      .min(10, { message: "Sort order must be at least 10" })
      .max(100, { message: "Sort order must be at most 100" })
      .refine((val) => val % 10 === 0, {
        message: "Sort order must be a multiple of 10"
      })
      .optional(),
    label: z.string().optional(),
    dbCategory: z.string().optional(),
    categoryKey: z.string().optional(),
    dependsOn: z.string().optional(),
  })
  .refine(
    (data) => {
      // If category is 'other', newCategory must be a string of at least 2 characters.
      if (data.category === "other") {
        return data.newCategory && data.newCategory.length >= 2;
      }
      return true;
    },
    {
      message: "New category name must be at least 2 characters.",
      path: ["newCategory"],
    }
  )
  .refine(
    (data) => {
      if (data.hasServiceCategory) {
        return data.type && data.column && data.sortOrder;
      }
      return true;
    },
    {
      message:
        "Type, column, and sort order are required when service category is enabled",
      path: ["type"],
    }
  );

interface CreateServiceFormProps {
  categories: string[];
}

const CreateServiceForm = ({ categories }: CreateServiceFormProps) => {
  const uniqueCategories = [...new Set(categories)];
  const [state, formAction, isPending] = useActionState<any, FormData>(
    createService,
    undefined
  );
  const [availableSortOrders, setAvailableSortOrders] = useState<{
    left: number[];
    right: number[];
    full: number[];
  }>({ left: [], right: [], full: [] });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: "",
      price: 0,
      category: "",
      newCategory: "",
      hasServiceCategory: false,
      type: undefined,
      column: undefined,
      sortOrder: undefined,
      label: "",
      dbCategory: "",
      categoryKey: "",
      dependsOn: "",
    },
  });

  const watchedCategory = form.watch("category");
  const watchedColumn = form.watch("column");
  const watchedHasServiceCategory = form.watch("hasServiceCategory");

  // Load available sort orders when component mounts
  useEffect(() => { loadAvailableSortOrders(); }, []);

  // Update available sort orders when column changes
  useEffect(() => {
    if (watchedColumn) {
      const lowestOrder = availableSortOrders[watchedColumn]?.[0];
      if (lowestOrder) form.setValue("sortOrder", lowestOrder);
    }
  }, [watchedColumn, availableSortOrders, form]);

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

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      form.reset();
      loadAvailableSortOrders(); // Refresh sort orders after successful creation
    } else if (state?.error) {
      toast.error("Creation Failed", { description: state.error });
    }
  }, [state]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("service", data.service);
    formData.append("price", String(data.price));
    formData.append("hasServiceCategory", String(data.hasServiceCategory));

    // Pass all service category data if enabled
    if (data.hasServiceCategory) {
      Object.keys(data).forEach(key => {
        const value = data[key as keyof typeof data];
        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });
    }

    const finalCategory =
      data.category === "other" ? data.newCategory! : data.category;
    formData.append("category", finalCategory);
    formData.append("newCategory", data.newCategory || "");

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
            name="service"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Haircut"
                    {...field}
                    disabled={isPending}
                  />
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
                  <Input
                    type="number"
                    placeholder="e.g., 500"
                    {...field}
                    disabled={isPending}
                  />
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
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Add...</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedCategory === "other" && (
            <FormField
              control={form.control}
              name="newCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter new category"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

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
                    disabled={isPending}
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
                        disabled={isPending}
                      />
                    </FormControl>
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
                        disabled={isPending}
                      />
                    </FormControl>
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
                name="dependsOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Depends On (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., facials"
                        {...field}
                        disabled={isPending}
                      />
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

          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create Service"}
          </Button>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </form>
      </Form>
    </div>
  );
};

export default CreateServiceForm;
