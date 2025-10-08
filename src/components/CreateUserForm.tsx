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
import { useActionState, startTransition } from "react";
import { createUserProfile } from "@/actions";
import { Checkbox } from "./ui/checkbox";

const sanitizeInput = {
  username: (str: string) => {
    return str
      .replace(/<[^>]*>/g, "") // Strip HTML
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "") // Only allow safe characters
      .slice(0, 50); // Ensure max length
  },
};

const formSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username must be at least 2 characters." })
    .transform((val) => sanitizeInput.username(val)),
  email: z.string().min(1, { message: "Email is required." }).email({
    message: "Invalid email address.",
  }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters." }),
  phone: z.string().refine((val) => val === "" || /^(09|\+639)\d{9}$/.test(val), {
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("username", data.username);
    formData.append("email", data.email);
    formData.append("password", data.password);
    if (data.phone) formData.append("phone", data.phone);
    if (data.location) formData.append("location", data.location);
    if (data.isAdmin) formData.append("isAdmin", "on");

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="grid gap-4 px-4">
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
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+639... or 09..."
                    {...field}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>
                  The user's Phone Number.
                </FormDescription>
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
                    <SelectItem value="PH, Philippines">PH, Philippines</SelectItem>
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
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create User"}
          </Button>
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state?.success && (
            <p className="text-sm text-green-500">{state.success}</p>
          )}
        </form>
      </Form>
    </div>
  );
};

export default CreateUserForm;
