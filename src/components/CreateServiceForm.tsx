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
  useEffect,
} from "react";
import { createService } from "@/actions";
import { toast } from "sonner";

const formSchema = z.object({
  service: z.string()
    .transform((val) => val.replace(/<[^>]*>/g, "").trim())
    .pipe(
      z.string().min(2, { message: "Service name must be at least 2 characters." })
    ),
  price: z.coerce.number({ message: "Price must be a number." })
    .min(0, { message: "Price must be a positive number." }),
  category: z.string().min(1, { message: "Category is required." }),
});

interface CreateServiceFormProps {
  categories: string[];
}

const CreateServiceForm = ({ categories }: CreateServiceFormProps) => {
  const [state, formAction, isPending] = useActionState<any, FormData>(
    createService,
    undefined
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service: "",
      price: 0,
      category: "",
    },
  });

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

  useEffect(() => {
    if (state?.success) {
      toast.success(state.success);
      form.reset();
    } else if (state?.error) {
      toast.error("Creation Failed", { description: state.error });
    }
  }, [state, form]);

  const uniqueCategories = [...new Set(categories)];

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
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
