"use client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { useForm } from "react-hook-form";
import { Button } from "./ui/button";
import { useActionState, startTransition } from "react";
import { updateUserProfile } from "@/actions";

const formSchema = z.object({
  username: z
    .string()
    .min(2, { message: "Username has to be at least 2 characters" })
    .max(50)
    .transform((val) => sanitizeInput.username(val)),
  email: z
    .string()
    .min(1, { message: "Email is required." })
    .email({ message: "Invalid email address" }),
  phone: z.string().min(10).max(15), // Changed to string for better handling
  location: z.string().min(2),
});

const sanitizeInput = {
  stripHtml: (str: string) => str.replace(/<[^>]*>/g, ""),

  escapeHtml: (str: string) =>
    str.replace(/[&<>"']/g, (match) => {
      const escape: Record<string, string> = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return escape[match];
    }),

  clean: (str: string) => str.replace(/[<>{}]/g, "").trim(),

  username: (str: string) => {
    return str
      .replace(/<[^>]*>/g, "") // Strip HTML
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "") // Only allow safe characters
      .slice(0, 50); // Ensure max length
  },
};

type UserProfile = {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  isAdmin: boolean | null;
};

interface EditUsersProps {
  userProfile: UserProfile;
}

const EditUsers = ({ userProfile }: EditUsersProps) => {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: userProfile?.username || "",
      email: userProfile?.email || "",
      phone: userProfile?.phone || "",
      location: userProfile?.location || "",
    },
  });

  const [state, formAction, isPending] = useActionState<any, FormData>(
    updateUserProfile,
    undefined
  );

  // Handle form submission with validation
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("userId", userProfile.id); // Pass the user ID to the action
    formData.append("username", data.username);
    formData.append("email", data.email);
    formData.append("phone", data.phone ?? "");
    formData.append("location", data.location ?? "");

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Form {...form}>
      <form className="space-y-8 pt-6 px-3" onSubmit={form.handleSubmit(onSubmit)}>
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
                This is your public display name.
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
                Only admin can see your email.
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
                  placeholder="Enter phone number"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Only admin can see your phone.
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
              <FormControl>
                <Input
                  placeholder="Enter location"
                  {...field}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>
                Publicly displayed location.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isPending}>
          {isPending ? "Updating..." : "Update User"}
        </Button>

        {/* Show action state if there are errors or success messages */}
        {state?.error && (
          <p className="text-red-500 text-sm">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-green-500 text-sm">{state.success}</p>
        )}
      </form>
    </Form>
  );
};

export default EditUsers;
