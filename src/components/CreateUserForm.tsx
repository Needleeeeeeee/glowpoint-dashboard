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
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { useActionState, startTransition, useEffect } from "react";
import { createUserProfile } from "@/actions";
import { Checkbox } from "./ui/checkbox";
import { toast } from "sonner";

const sanitizeInput = {
  username: (str: string) => {
    return str
      .replace(/<[^>]*>/g, "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 50);
  },
};

const formSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters." })
    .transform((val) => sanitizeInput.username(val)),
  email: z
    .string()
    .email({ message: "Invalid email address." })
    .min(1, { message: "Email is required." })
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  phone: z
    .string()
    .refine((val) => val === "" || /^(09|\+639)\d{9}$/.test(val), {
      message: "Invalid Philippine phone number format. Use +639... or 09...",
    }),
  location: z.string().min(1, { message: "Please select a location." }),
  isAdmin: z.boolean().default(false),
});

const CreateUserForm = () => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      phone: "",
      location: "",
      isAdmin: false,
    },
  });

  const [state, formAction, isPending] = useActionState<any, FormData>(
    createUserProfile,
    undefined
  );

  // Show toast notifications when state changes
  useEffect(() => {
    if (state?.error) {
      toast.error("Creation Failed", {
        description: state.error,
      });
    }
    if (state?.success) {
      toast.success("Success", {
        description: state.success,
      });
      form.reset();
    }
  }, [state, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    console.log("=== FORM SUBMISSION START ===");
    console.log("Form data:", data);

    try {
      const formData = new FormData();
      formData.append("username", data.username);
      formData.append("email", data.email);
      formData.append("password", data.password);
      if (data.phone) formData.append("phone", data.phone);
      if (data.location) formData.append("location", data.location);
      if (data.isAdmin) formData.append("isAdmin", "on");

      console.log("FormData entries:");
      for (const [key, value] of formData.entries()) {
        console.log(`  ${key}: ${value}`);
      }

      startTransition(() => {
        console.log("Starting transition...");
        formAction(formData);
      });
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error("Error", {
        description: "Failed to submit form. Check console for details.",
      });
    }
  };

  return (
    <div className="grid gap-4 px-4 max-h-[70vh] overflow-y-auto">
      <Form {...form}>
        <form className="space-y-2" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter username"
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  This will be the user's public display name.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    {...field}
                    disabled={isPending}
                    autoComplete="email"
                  />
                </FormControl>
                <FormDescription>
                  The user's email address. Must be unique.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    {...field}
                    disabled={isPending}
                    autoComplete="new-password"
                  />
                </FormControl>
                <FormDescription>
                  A secure password for the new user.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone (Optional)</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+639... or 09..."
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>The user's Phone Number.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="PH, Philippines">
                      PH, Philippines
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>The user's location.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isAdmin"
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
                  <FormLabel>Admin</FormLabel>
                  <FormDescription>
                    Grant this user administrative privileges.
                  </FormDescription>
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Creating..." : "Create User"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateUserForm;
