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
  phone: z.string().min(10).max(15),
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
      .replace(/<[^>]*>/g, "")
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 50);
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const formData = new FormData();
    formData.append("userId", userProfile.id);
    formData.append("username", data.username);
    formData.append("email", data.email);
    formData.append("phone", data.phone ?? "");
    formData.append("location", data.location ?? "");

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className="pb-6">
      <Form {...form}>
        <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
          {/* Status Messages */}
          {state?.error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                {state.error}
              </p>
            </div>
          )}
          {state?.success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                {state.success}
              </p>
            </div>
          )}

          {/* Username Field */}
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  Username
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter username"
                    {...field}
                    disabled={isPending}
                    className="h-11 bg-background"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  This is your public display name.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    {...field}
                    disabled={isPending}
                    className="h-11 bg-background"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  Only admin can see your email.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Phone Field */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="Enter phone number"
                    {...field}
                    disabled={isPending}
                    className="h-11 bg-background"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  Only admin can see your phone.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Location Field */}
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold">
                  Location
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter location"
                    {...field}
                    disabled={isPending}
                    className="h-11 bg-background"
                  />
                </FormControl>
                <FormDescription className="text-xs text-muted-foreground">
                  Publicly displayed location.
                </FormDescription>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <div className="pt-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 -mx-6 px-6 py-4 border-t">
            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-11 font-semibold"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Updating...
                </span>
              ) : (
                "Update User"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditUsers;
