"use client";

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
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { login, signInWithGoogle } from "@/actions";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "./ui/button";

const formSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required" })
    .email({ message: "Please enter a valid email address" })
    .max(100, { message: "Email must be less than 100 characters" })
    .transform(val => sanitizeInput.email(val)),
  password: z
    .string()
    .min(8, { message: "Password has to be atleast 8 characters" })
    .max(50)
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/\d/, "Password must include at least one number")
    .regex(
      /[!@#$%^&*(),.?":{}|<>]/,
      "Password must include at least one special character"
    )
    .transform(val => sanitizeInput.password(val)),
});

const sanitizeInput = {
  stripHtml: (str: string) => str.replace(/<[^>]*>/g, ''),

  escapeHtml: (str: string) =>
    str.replace(/[&<>"']/g, (match) => {
      const escape: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }
      return escape[match]
    }),

  clean: (str: string) =>
    str.replace(/[<>{}]/g, '').trim(),

  email: (str: string) => {
    return str
      .replace(/<[^>]*>/g, '') // Strip HTML
      .trim()
      .toLowerCase() // Convert to lowercase for consistency
      .replace(/[^\w@.-]/g, '') // Only allow word chars, @, dots, and hyphens
      .slice(0, 100); // Ensure max length
  },

  password: (str: string) => {
    return str
      .replace(/<[^>]*>/g, '') // Strip HTML tags
      .replace(/[<>{}]/g, '') // Remove dangerous brackets
      .trim()
      .slice(0, 50); // Ensure max length
  }
};

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 48 48"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.12C34.553 8.246 29.692 6 24 6C12.955 6 4 14.955 4 26s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039L38.804 12.12C34.553 8.246 29.692 6 24 6C16.318 6 9.656 10.019 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 46c5.952 0 11.22-1.992 14.918-5.416l-6.52-4.818C29.932 39.123 27.235 40 24 40c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l6.571-4.819C38.961 12.01 34.553 8.246 29.692 6 24 6 16.318 6 9.656 10.019 6.306 14.691 4 20.165 4 26s2.306 11.309 6.306 15.309z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l6.571-4.819C38.961 12.01 34.553 8.246 29.692 6 24 6 16.318 6 9.656 10.019 6.306 14.691 4 20.165 4 26s2.306 11.309 6.306 15.309C9.656 39.981 16.318 44 24 44c5.952 0 11.22-1.992 14.918-5.416l-6.52-4.818C29.932 39.123 27.235 40 24 40c-4.473 0-8.284-2.686-10.039-6.417l14.64-1.1c.246.5.477.999.693 1.482z"
      />
    </svg>
  );
}

const LogInForm = () => {
  const [state, formAction, isPending] = useActionState<any, FormData>(login, undefined);
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const watchedValues = form.watch();

  // Handle successful login
  useEffect(() => {
    if (state?.success) {
      console.log("Login successful, redirecting...");
      router.push("/home");
    }
  }, [state?.success, router]);

  const handleFormAction = (formData: FormData) => {
    const sanitizedEmail = sanitizeInput.email(formData.get('email') as string || '');
    const sanitizedPassword = sanitizeInput.password(formData.get('password') as string || '');

    console.log("Form submission:", { email: sanitizedEmail, passwordLength: sanitizedPassword.length });

    const sanitizedFormData = new FormData();
    sanitizedFormData.set('email', sanitizedEmail);
    sanitizedFormData.set('password', sanitizedPassword);

    return formAction(sanitizedFormData);
  };

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form className="space-y-4" action={handleFormAction}>
          <input type="hidden" name="email" value={watchedValues.email || ""} />
          <input type="hidden" name="password" value={watchedValues.password || ""} />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter your email"
                    {...field}
                    type="email"
                    disabled={isPending}
                    onChange={(e) => {
                      const sanitized = sanitizeInput.email(e.target.value);
                      field.onChange(sanitized);
                    }}
                  />
                </FormControl>
                <FormDescription>Enter your email address.</FormDescription>
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
                    placeholder="Enter password"
                    {...field}
                    type="password"
                    disabled={isPending}
                    onChange={(e) => {
                      const sanitized = sanitizeInput.password(e.target.value);
                      field.onChange(sanitized);
                    }}
                  />
                </FormControl>
                <FormDescription>Enter your password.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Logging in..." : "Log In"}
          </Button>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state?.success && <p className="text-sm text-green-500">{state.success}</p>}
        </form>
      </Form>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-primary-foreground px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <form action={signInWithGoogle}>
        <Button variant="outline" className="w-full flex items-center gap-2">
          <GoogleIcon />
          Sign in with Google
        </Button>
      </form>
    </div>
  );
};

export default LogInForm;
