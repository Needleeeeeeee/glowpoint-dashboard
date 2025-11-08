"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { z } from "zod";
import { decryptData, encryptData } from "./utils/encryption";

export const login = async (
  prevState: { error: undefined | string },
  formData: FormData
) => {
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  // Validate input
  if (!data.email || !data.password) {
    return { error: "Email and password are required!" };
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword(
    data
  );

  if (error) {
    console.error("Supabase auth error:", error);
    return { error: "Invalid email or password!" };
  }

  if (signInData.session) {
    const { data: mfaData } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaData?.nextLevel === "aal2" && mfaData?.currentLevel !== "aal2") {
      // MFA is required
      redirect("/login/verify-2fa");
    }
  }

  // Revalidate path to ensure the new state is reflected
  revalidatePath("/", "layout");
  redirect("/home");
};

export const logout = async () => {
  const supabase = await createClient();

  // Sign out from Supabase
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase logout error:", error);
  }

  // Revalidate and redirect
  revalidatePath("/", "layout");
  redirect("/login");
};

export async function deactivateUsers(userIds: string[]) {
  if (!userIds || userIds.length === 0) {
    return { error: "No users selected." };
  }

  const supabase = await createClient();

  const rpcErrors = [];
  for (const userId of userIds) {
    const { error } = await supabase.rpc("deactivate_user", {
      p_user_id: userId,
    });

    if (error) {
      console.error(`Error deactivating user ${userId}:`, error);
      rpcErrors.push({ userId, message: error.message });
    }
  }

  if (rpcErrors.length > 0) {
    console.error("Errors deactivating users via RPC:", rpcErrors);
    return {
      error: "Failed to deactivate some users. Please check server logs.",
    };
  }

  revalidatePath("/(app)/users", "page");
  return { success: `${userIds.length} user(s) have been deactivated.` };
}

export async function reactivateUser(userId: string) {
  if (!userId) {
    return { error: "No user selected." };
  }

  const supabase = await createClient();

  // First, update the user's profile to be active
  const { error: profileError } = await supabase
    .from("Profiles")
    .update({ is_active: true })
    .eq("id", userId);

  if (profileError) {
    console.error("Error reactivating user in Profiles:", profileError);
    return { error: "Failed to reactivate user profile." };
  }

  // Then, remove the ban from Supabase Auth using the admin client
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { ban_duration: "none" } // Remove the ban
  );

  if (authError) {
    console.error(`Error reactivating user ${userId} in Auth:`, authError);
    // Rollback the profile change
    await supabase
      .from("Profiles")
      .update({ is_active: false })
      .eq("id", userId);
    return { error: "Failed to reactivate user in authentication service." };
  }

  revalidatePath("/(app)/users", "page");
  return { success: "User has been reactivated." };
}

export const updateUserProfile = async (prevState: any, formData: FormData) => {
  const supabase = await createClient();

  // Check for authenticated user and if they are an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to perform this action." };
  }

  const { data: adminProfile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.isAdmin) {
    return { error: "You do not have permission to update user profiles." };
  }

  // Get form data
  const userIdToUpdate = formData.get("userId") as string;
  const newUsername = formData.get("username") as string;
  const newEmail = formData.get("email") as string;
  const newPhone = formData.get("phone") as string;
  const newLocation = formData.get("location") as string;

  // Basic validation
  if (!userIdToUpdate) return { error: "User ID is missing." };
  if (!newUsername || newUsername.trim().length < 2)
    return { error: "Username must be at least 2 characters long." };
  if (!newEmail || !newEmail.includes("@"))
    return { error: "Please provide a valid email address." };

  // Create an admin client to update auth user
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Update the user in auth.users
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userIdToUpdate,
    {
      email: newEmail,
    }
  );

  // Update the profile in Supabase
  const { error: profileError } = await supabase
    .from("Profiles")
    .update({
      username: newUsername,
      email: encryptData(newEmail),
      phone: newPhone,
      location: newLocation,
    })
    .eq("id", userIdToUpdate);

  if (authError) {
    console.error("Supabase auth update error:", authError);
    // Revert profile changes if auth update failed? For now, just error out.
    return { error: `Failed to update auth user: ${authError.message}` };
  }

  if (profileError) {
    console.error("Supabase profile update error:", profileError);
    return { error: `Failed to update profile: ${profileError.message}` };
  }

  // Revalidate paths to show updated data
  revalidatePath("/users");
  revalidatePath(`/users/${newUsername}`);
  revalidatePath("/", "layout"); // Revalidate layout to update navbar/sidebar

  return { success: "User profile updated successfully!" };
};

export const requestPasswordReset = async (
  prevState: { error?: string; success?: string } | undefined,
  formData: FormData
) => {
  try {
    const supabase = await createClient();
    let email = formData.get("email") as string;

    if (!email) {
      return { error: "Email is required." };
    }

    email = email.toLowerCase().trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Invalid email format." };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    if (!siteUrl) {
      console.error("NEXT_PUBLIC_SITE_URL is not defined");
      return { error: "Server configuration error." };
    }

    console.log("Attempting password reset for:", email);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback/password-reset`,
    });

    if (error) {
      console.error("Password reset error:", error);
      return { error: error.message || "Could not send password reset link." };
    }

    console.log("Password reset email sent successfully");

    return { success: "Password reset link sent. Please check your email." };
  } catch (err: any) {
    console.error("Unexpected error in requestPasswordReset:", err);
    return { error: "An unexpected error occurred. Please try again." };
  }
};

export const updateUserPassword = async (
  prevState: any,
  formData: FormData
) => {
  const supabase = await createClient();
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return { message: "Password and confirmation are required.", error: true };
  }

  if (password !== confirmPassword) {
    return { message: "Passwords do not match.", error: true };
  }

  if (password.length < 6) {
    return {
      message: "Password must be at least 6 characters long.",
      error: true,
    };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    console.error("Password update error:", error);
    return { message: `Error: ${error.message}`, error: true };
  }

  revalidatePath("/", "layout");
  redirect("/home");
};

export const verifyMfaAndCompleteLogin = async (formData: FormData) => {
  const supabase = await createClient();
  const code = formData.get("code") as string;
  const next = formData.get("next") as string; // Get the next parameter from form

  if (!code) {
    const nextParam = next ? `?next=${encodeURIComponent(next)}` : "";
    redirect(`/login/verify-2fa${nextParam}&error=Code is required.`);
  }

  const { data: factorData, error: factorError } =
    await supabase.auth.mfa.listFactors();
  if (factorError) {
    const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
    redirect(
      `/login/verify-2fa?error=${encodeURIComponent(
        factorError.message
      )}${nextParam}`
    );
  }

  const totpFactor = factorData?.all.find(
    (f) => f.factor_type === "totp" && f.status === "verified"
  );
  if (!totpFactor) {
    redirect(
      "/login?error=No verified 2FA method found. Please contact support."
    );
  }

  const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
    factorId: totpFactor.id,
    code,
  });

  if (verifyError) {
    const nextParam = next ? `&next=${encodeURIComponent(next)}` : "";
    redirect(
      `/login/verify-2fa?error=Invalid code. Please try again.${nextParam}`
    );
  }

  revalidatePath("/", "layout");

  // If there's a next parameter, redirect there; otherwise go to home
  redirect(next || "/home");
};

export const updateUserProfileDetails = async (
  prevState: any,
  formData: FormData
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to update your profile." };
  }

  const { data: userProfile, error: profileFetchError } = await supabase
    .from("Profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (profileFetchError || !userProfile) {
    console.error("Profile fetch error:", profileFetchError);
    return { error: "Could not load profile data." };
  }

  const bio = formData.get("bio") as string;
  const avatarFile = formData.get("avatar") as File;

  const profileUpdateData: { bio?: string; avatar_url?: string } = {};

  if (bio !== null) {
    profileUpdateData.bio = bio;
  }

  if (avatarFile && avatarFile.size > 0) {
    const fileExt = avatarFile.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return { error: `Failed to upload avatar: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    profileUpdateData.avatar_url = urlData.publicUrl;
  }

  if (Object.keys(profileUpdateData).length === 0) {
    return { success: "No changes to save." };
  }

  const { data: updatedProfile, error: updateError } = await supabase
    .from("Profiles")
    .update(profileUpdateData)
    .eq("id", user.id)
    .select("id, username, bio, avatar_url")
    .single();

  if (updateError) {
    console.error("Profile update error:", updateError);
    return { error: `Failed to update profile: ${updateError.message}` };
  }

  revalidatePath(`/users/${updatedProfile.username}`);
  return { success: "Profile updated successfully!", data: updatedProfile };
};

export const enrollMfa = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    issuer: "Glowpoint",
  });

  if (error) {
    console.error("MFA enroll error:", error);
    return { error: error.message };
  }

  if (!data) {
    return { error: "Could not start MFA enrollment." };
  }

  const qrCode = data.totp.qr_code;
  const factorId = data.id;

  return { data: { qr_code: qrCode, factor_id: factorId } };
};

export const challengeAndVerifyMfa = async (
  prevState: any,
  formData: FormData
) => {
  const supabase = await createClient();
  const factorId = formData.get("factorId") as string;
  const code = formData.get("code") as string;

  if (!factorId || !code) {
    return { error: "Factor ID and code are required." };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) {
    console.error("MFA challenge error:", challengeError);
    return { error: challengeError.message };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    console.error("MFA verify error:", verifyError);
    return { error: "Invalid verification code." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.user_metadata.username) {
    revalidatePath(`/users/${user.user_metadata.username}`);
  }
  return { success: "2FA enabled successfully!" };
};

export const unenrollMfa = async (formData: FormData) => {
  const supabase = await createClient();
  const factorId = formData.get("factorId") as string;

  if (!factorId) {
    return { error: "Factor ID is required." };
  }

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    console.error("MFA unenroll error:", error);
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.user_metadata.username) {
    revalidatePath(`/users/${user.user_metadata.username}`);
  }
};

export async function sendAppointmentReminders(): Promise<{
  success: boolean;
  sent: number;
  errors: string[];
}> {
  const supabase = await createClient();


  const now = new Date();
  const reminderWindowStart = new Date(now.getTime() + 115 * 60 * 1000); // 1 hour 55 mins
  const reminderWindowEnd = new Date(now.getTime() + 125 * 60 * 1000); // 2 hours 5 mins

  const today = now.toISOString().split("T")[0];
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const { data: appointments, error: fetchError } = await supabase
    .from("Appointments")
    .select("*")
    .eq("status", "verified")
    .in("Date", [today, tomorrow]);

  if (fetchError) {
    console.error("Error fetching appointments for reminders:", fetchError);
    return { success: false, sent: 0, errors: [fetchError.message] };
  }

  const upcomingAppointments = appointments.filter((app) => {
    const appointmentDateTime = new Date(`${app.Date}T${app.Time}`);
    return (
      appointmentDateTime >= reminderWindowStart &&
      appointmentDateTime <= reminderWindowEnd
    );
  });

  if (upcomingAppointments.length === 0) {
    return { success: true, sent: 0, errors: [] };
  }

  const results = await Promise.all(
    upcomingAppointments.map((app) => sendBrevoEmail("reminder", app))
  );

  const sentCount = results.filter((r) => r.success).length;
  const errorMessages = results
    .filter((r) => !r.success)
    .map((r) => r.error || "Unknown email error");

  return {
    success: errorMessages.length === 0,
    sent: sentCount,
    errors: errorMessages,
  };
}

export const signInWithGoogle = async () => {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/auth/verify-profile`,
    },
  });

  if (error) {
    console.error("Google Sign-In Error:", error);
    return redirect("/login?message=Could not authenticate with Google");
  }

  return redirect(data.url);
};

export const createUserProfile = async (prevState: any, formData: FormData) => {
  const supabase = await createClient();

  // Check for authenticated user and if they are an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to perform this action." };
  }

  const { data: adminProfile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.isAdmin) {
    return { error: "You do not have permission to create users." };
  }

  // Get form data
  const email = (formData.get("email") as string).toLowerCase().trim();
  const password = formData.get("password") as string;
  const username = formData.get("username") as string;
  const phone = formData.get("phone") as string;
  const location = formData.get("location") as string;
  const isAdmin = formData.get("isAdmin") === "on";

  // Basic validation
  if (!email || !email.includes("@"))
    return { error: "Please provide a valid email address." };
  if (!password || password.length < 6)
    return { error: "Password must be at least 6 characters long." };
  if (!username || username.trim().length < 2)
    return { error: "Username must be at least 2 characters long." };

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Check if email already exists
    const { data: existingUser, error: existingUserError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("email", email)
    .single();
  if (existingUser) {
    return { error: "A user with this email already exists." };
  }

  // Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username,
        phone,
        location,
      },
    });

  if (authError) {
    console.error("Supabase auth create error:", authError);
    return { error: `Failed to create auth user: ${authError.message}` };
  }

  if (!authData.user) {
    return { error: "Failed to create user." };
  }

  // Insert profile in 'Profiles' table with retry logic
  let retries = 3;
  let profileError;

  while (retries > 0) {
    const { error } = await supabaseAdmin
      .from("Profiles")
      .update({
        username: username,
        phone: phone ? encryptData(phone) : null,
        location: location || null,
        isAdmin: isAdmin,
        is_active: true,
      })
      .eq("id", authData.user.id);

    if (!error) {
      profileError = null;
      break;
    }

    profileError = error;
    retries--;

    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
    }
  }

  if (profileError) {
    console.error("Supabase profile insert error:", profileError);

    // Attempt to delete the auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      authData.user.id
    );

    if (deleteError) {
      console.error("Failed to rollback auth user:", deleteError);
      return {
        error: `Profile creation failed and user cleanup failed. Orphaned user ID: ${authData.user.id}. Please delete manually.`,
      };
    }

    return { error: `Failed to create profile: ${profileError.message}` };
  }

  revalidatePath("/users");
  return { success: "User created successfully!" };
};

const CreateServiceSchema = z
  .object({
    service: z
      .string()
      .min(2, { message: "Service name must be at least 2 characters." }),
    price: z.coerce
      .number()
      .min(0, { message: "Price must be a positive number." }),
    category: z.string().min(1, { message: "Category is required." }),
    newCategory: z.string().optional(),
    type: z.string().optional(),
    column: z.string().optional(),
    sortOrder: z.coerce.number().optional(),
    label: z.string().optional(),
    dbCategory: z.string().optional(),
    categoryKey: z.string().optional(),
    dependsOn: z.string().optional(),
  })
  .refine(
    (data) => {
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
      if (data.category === "other") {
        return data.label && data.dbCategory && data.categoryKey;
      }
      return true;
    },
    {
      message:
        "Label, DB Category, and Category Key are required when creating a new service category.",
    }
  );

export async function createService(prevState: any, formData: FormData) {
  const supabase = await createClient();

  // Check for authenticated user and if they are an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to perform this action." };
  }

  const { data: adminProfile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.isAdmin) {
    return { error: "You do not have permission to create services." };
  }

  const validatedFields = CreateServiceSchema.safeParse({
    service: formData.get("service"),
    price: formData.get("price"),
    category: formData.get("category") || "",
    newCategory: formData.get("newCategory") || undefined,
    type: formData.get("type") || undefined,
    column: formData.get("column") || undefined,
    sortOrder: formData.get("sortOrder") || undefined,
    label: formData.get("label") || undefined,
    dbCategory: formData.get("dbCategory") || undefined,
    categoryKey: formData.get("categoryKey") || undefined,
    dependsOn: formData.get("dependsOn") || undefined,
  });

  if (!validatedFields.success) {
    const errors = validatedFields.error.flatten().fieldErrors;
    // Properly format the error object into a string for the toast
    const errorMessage = Object.entries(errors)
      .map(([key, value]) => `${key}: ${value.join(", ")}`)
      .join("; ");
    return { error: `Invalid form data: ${errorMessage}` };
  }

  let { service, category, price, newCategory, ...categoryData } =
    validatedFields.data;

  const isCreatingNewCategory = category === "other" && newCategory;
  if (isCreatingNewCategory) {
    category = newCategory!;
  }

  try {
    // Insert the service and return the created record
    const { data, error } = await supabase
      .from("Services")
      .insert({
        service: service.trim(),
        category: category.trim(),
        price: price,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating service:", error);
      return {
        error: "Failed to create service: " + error.message,
      };
    }

    if (isCreatingNewCategory) {
      const {
        type,
        column,
        sortOrder,
        label,
        dbCategory,
        categoryKey,
        dependsOn,
      } = categoryData;

      if (
        !type ||
        !column ||
        !label ||
        !dbCategory ||
        !categoryKey ||
        sortOrder === undefined ||
        sortOrder === null
      ) {
        return {
          error:
            "Service was created, but category creation failed: Missing required category fields.",
        };
      }

      const { error: categoryError } = await supabase
        .from("ServiceCategories")
        .upsert(
          {
            type,
            column,
            sort_order: sortOrder,
            label,
            db_category: dbCategory,
            category_key: categoryKey,
            depends_on: dependsOn || null,
          },
          { onConflict: "db_category" }
        );

      if (categoryError) {
        console.error("Error creating service category:", categoryError);
        // Rollback service creation
        await supabase.from("Services").delete().eq("id", data.id);
        return {
          error: `Service creation failed: Could not create service category. ${categoryError.message}`,
        };
      }
    }

    revalidatePath("/services");
    return {
      success: "Service created successfully",
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: "An unexpected error occurred",
    };
  }
}

const UpdateServiceSchema = z.object({
  id: z.coerce.number(),
  service: z
    .string()
    .min(2, { message: "Service name must be at least 2 characters." }),
  price: z.coerce
    .number()
    .min(0, { message: "Price must be a positive number." }),
  category: z
    .string()
    .min(2, { message: "Category must be at least 2 characters." }),
});

export const updateService = async (prevState: any, formData: FormData) => {
  const supabase = await createClient();

  // Check for authenticated user and if they are an admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to perform this action." };
  }

  const { data: adminProfile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!adminProfile?.isAdmin) {
    return { error: "You do not have permission to update services." };
  }

  const validatedFields = UpdateServiceSchema.safeParse({
    id: formData.get("id"),
    service: formData.get("service"),
    price: formData.get("price"),
    category: formData.get("category"),
  });

  if (!validatedFields.success) {
    return { error: "Invalid form data. Please check your inputs." };
  }

  const { id, service, price, category } = validatedFields.data;

  // Update service in 'Services' table
  const { error: serviceError } = await supabase
    .from("Services")
    .update({ service, price, category })
    .eq("id", id);

  if (serviceError) {
    console.error("Supabase service update error:", serviceError);
    return { error: `Failed to update service: ${serviceError.message}` };
  }

  revalidatePath("/services");
  return { success: "Service updated successfully!" };
};

export const deleteService = async (serviceId: number) => {
  try {
    if (!serviceId) {
      return { error: "No service ID provided." };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Authentication required. Please log in." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("Profiles")
      .select("isAdmin")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.isAdmin) {
      return { error: "Insufficient permissions. Admin access required." };
    }

    const { error: deleteError } = await supabase
      .from("Services")
      .delete()
      .eq("id", serviceId);

    if (deleteError) {
      return { error: `Delete failed: ${deleteError.message}` };
    }

    revalidatePath("/services");
    return { success: "Service deleted successfully." };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { error: `Server error: ${errorMessage}` };
  }
};

export const deleteServices = async (serviceIds: number[]) => {
  try {
    if (!serviceIds || serviceIds.length === 0) {
      return { error: "No service IDs provided." };
    }

    const supabase = await createClient();

    // Get current user and verify admin status
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return { error: "Authentication required. Please log in." };
    }

    const { data: profile, error: profileError } = await supabase
      .from("Profiles")
      .select("isAdmin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { error: "Failed to verify user permissions." };
    }

    if (!profile?.isAdmin) {
      return { error: "Insufficient permissions. Admin access required." };
    }

    const { error: deleteError } = await supabase
      .from("Services")
      .delete()
      .in("id", serviceIds);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return { error: `Delete failed: ${deleteError.message}` };
    }

    revalidatePath("/services");

    return { success: `${serviceIds.length} service(s) deleted successfully.` };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { error: `Server error: ${errorMessage}` };
  }
};

export const deletePayments = async (paymentIds: string[]) => {
  try {
    if (!paymentIds || paymentIds.length === 0) {
      return { error: "No payment IDs provided." };
    }

    const supabase = await createClient();

    // Get current user and verify admin status
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return { error: "Authentication required. Please log in." };
    }

    // Check admin privileges
    const { data: profile, error: profileError } = await supabase
      .from("Profiles")
      .select("isAdmin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { error: "Failed to verify user permissions." };
    }

    if (!profile?.isAdmin) {
      return { error: "Insufficient permissions. Admin access required." };
    }

    // Perform the delete operation
    const { error: deleteError } = await supabase
      .from("Appointments")
      .delete()
      .in("id", paymentIds);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return { error: `Delete failed: ${deleteError.message}` };
    }

    revalidatePath("/payments");

    return { success: `${paymentIds.length} payment(s) deleted successfully.` };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { error: `Server error: ${errorMessage}` };
  }
};

export const updatePaymentStatus = async (
  appointmentId: string,
  newStatus: string
) => {
  try {
    const supabase = await createClient();

    // Get current user and verify admin status
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return { error: "Authentication required. Please log in." };
    }

    // Check admin privileges
    const { data: profile, error: profileError } = await supabase
      .from("Profiles")
      .select("isAdmin")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error("Profile fetch error:", profileError);
      return { error: "Failed to verify user permissions." };
    }

    if (!profile?.isAdmin) {
      console.log("User is not admin:", profile);
      return { error: "Insufficient permissions. Admin access required." };
    }

    // Validate and sanitize inputs
    if (!appointmentId) {
      return { error: "Appointment ID is required." };
    }

    const trimmedId = appointmentId.toString().trim();

    // Handle both string and numeric IDs
    let queryId: string | number = trimmedId;

    // Parse as number if it looks numeric
    if (/^\d+$/.test(trimmedId)) {
      queryId = parseInt(trimmedId, 10);
    }

    // Validate status
    const validStatuses = ["pending", "success", "failed"];
    if (!validStatuses.includes(newStatus)) {
      return {
        error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      };
    }

    // Check if appointment exists first
    let { data: existingAppointment, error: fetchError } = await supabase
      .from("Appointments")
      .select("*")
      .eq("id", queryId)
      .maybeSingle(); // Use maybeSingle to avoid errors if no rows found

    if (fetchError) {
      console.error("Database fetch error:", fetchError);
      return { error: `Database error: ${fetchError.message}` };
    }

    if (!existingAppointment) {
      // Try alternative approaches if the appointment wasn't found

      const { data: stringMatch, error: stringError } = await supabase
        .from("Appointments")
        .select("*")
        .eq("id", trimmedId)
        .maybeSingle();

      if (!stringMatch) {
        // List all appointments for debugging
        const { data: allAppointments } = await supabase
          .from("Appointments")
          .select("id")
          .limit(10);

        return {
          error: `Appointment with ID "${appointmentId}" not found in database.`,
        };
      }

      // Use the found appointment
      existingAppointment = stringMatch;
    }

    // Check if status is already the target status
    if (existingAppointment.status === newStatus) {
      return { success: `Status is already "${newStatus}".` };
    }

    // Perform the update
    const { data: updatedData, error: updateError } = await supabase
      .from("Appointments")
      .update({ status: newStatus })
      .eq("id", existingAppointment.id) // Use the ID from the found record
      .select("*");

    if (updateError) {
      console.error("Update error:", updateError);
      return { error: `Update failed: ${updateError.message}` };
    }

    if (!updatedData || updatedData.length === 0) {
      console.error("Update returned no data");
      return { error: "Update operation failed - no rows affected." };
    }

    console.log("Update successful:", updatedData);

    revalidatePath("/payments");
    revalidatePath("/");

    return {
      success: `Payment status updated successfully to "${newStatus}".`,
      data: updatedData[0],
    };
  } catch (error) {
    console.error("=== UPDATE PAYMENT STATUS ERROR ===");
    console.error("Unexpected error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    return { error: `Server error: ${errorMessage}` };
  }
};

export const claimAppointment = async (
  appointmentId: string,
  employeeId: string,
  service: string
) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== employeeId) {
    return {
      error: "Unauthorized: You can only claim appointments for yourself.",
    };
  }

  const { data, error } = await supabase
    .from("Appointments")
    .update({
      claimed_by_id: employeeId,
      claimed_service: service,
      status: "assigned",
    })
    .eq("id", appointmentId)
    .eq("status", "verified") // Correctly target 'verified' appointments
    .select()
    .single();

  if (error) {
    console.error("Error claiming appointment:", error);
    return {
      error: "Failed to claim appointment. It might have already been claimed.",
    };
  }

  if (!data) {
    return { error: "Appointment not found or could not be claimed." };
  }

  revalidatePath("/payments");
  revalidatePath("/calendar");
  return { success: "Appointment claimed." };
};

export const unclaimAppointment = async (appointmentId: string) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized: You must be logged in." };
  }

  // Fetch the appointment to check who claimed it
  const { data: appointment, error: fetchError } = await supabase
    .from("Appointments")
    .select("claimed_by_id")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointment) {
    return { error: "Appointment not found." };
  }

  // Fetch the current user's profile to check for admin role
  const { data: profile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.isAdmin || false;

  // Only the employee who claimed it or an admin can unclaim it
  if (appointment.claimed_by_id !== user.id && !isAdmin) {
    return { error: "Unauthorized: You cannot unclaim this appointment." };
  }

  const { error } = await supabase
    .from("Appointments")
    .update({
      claimed_by_id: null,
      claimed_service: null,
      status: "verified", // Revert to 'verified' so it can be claimed again
    })
    .eq("id", appointmentId);

  if (error) {
    console.error("Error unclaiming appointment:", error);
    return { error: "Failed to unclaim appointment." };
  }

  revalidatePath("/payments");
  revalidatePath("/calendar");
  return { success: "Appointment unclaimed." };
};

export async function createServiceCategory(prevState: any, categoryData: any) {
  const supabase = await createClient();

  const { type, column, sortOrder, label, dbCategory, categoryKey, dependsOn } =
    categoryData;

  // Validate required fields
  if (!type || !column || !label || !dbCategory || !categoryKey) {
    return {
      error: "Label, DB Category, Category Key, Type, and Column are required.",
    };
  }

  // Validate type
  if (!["ExclusiveDropdown", "AddOnDropdown"].includes(type)) {
    return {
      error: "Type must be either ExclusiveDropdown or AddOnDropdown",
    };
  }

  // Validate column
  if (!["left", "right", "full"].includes(column)) {
    return {
      error: "Column must be left, right, or full",
    };
  }

  let finalSortOrder = sortOrder;

  if (finalSortOrder === undefined || finalSortOrder === null) {
    const { data: maxSortOrder, error: maxSortOrderError } = await supabase
      .from("ServiceCategories")
      .select("sort_order")
      .eq("column", column)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    if (maxSortOrderError && maxSortOrderError.code !== "PGRST116") {
      // PGRST116: no rows found
      return {
        error: "Failed to determine sort order: " + maxSortOrderError.message,
      };
    }

    const currentMax = maxSortOrder?.sort_order || 0;
    finalSortOrder = Math.ceil((currentMax + 1) / 10) * 10;
    if (finalSortOrder === 0) finalSortOrder = 10;
  }

  try {
    const insertData = {
      type,
      column,
      sort_order: finalSortOrder,
      label,
      db_category: dbCategory,
      category_key: categoryKey,
      depends_on: dependsOn || null,
    };

    const { error: insertError } = await supabase
      .from("ServiceCategories")
      .upsert(insertData, { onConflict: "db_category" });

    if (insertError) {
      return {
        error: "Failed to create service category: " + insertError.message,
      };
    }

    revalidatePath("/services");
    return {
      success: "Service category created successfully",
    };
  } catch (error) {
    return {
      error: "An unexpected error occurred: " + (error as Error).message,
    };
  }
}

export async function getExistingCategories() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ServiceCategories")
    .select("db_category")
    .order("db_category");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data.map(item => item.db_category);
}

export async function deleteServiceCategory(categoryId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Authentication required." };
  }
  const { data: profile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!profile?.isAdmin) {
    return { error: "Unauthorized: Admin access required." };
  }

  if (!categoryId) {
    return { error: "Category ID is required." };
  }
  const { data: category, error: categoryFetchError } = await supabase
    .from("ServiceCategories")
    .select("db_category")
    .eq("id", categoryId)
    .single();

  if (categoryFetchError || !category) {
    return { error: "Service category not found." };
  }

  const { data: services, error: servicesFetchError } = await supabase
    .from("Services")
    .select("id")
    .eq("category", category.db_category);

  if (servicesFetchError) {
    return { error: "Failed to check for associated services." };
  }

  if (services && services.length > 0) {
    return {
      error: `Cannot delete category. It is currently used by ${services.length} service(s).`,
    };
  }

  const { error: deleteError } = await supabase
    .from("ServiceCategories")
    .delete()
    .eq("id", categoryId);

  if (deleteError) {
    return {
      error: "Failed to delete service category: " + deleteError.message,
    };
  }
  revalidatePath("/services");
  return { success: "Service category deleted successfully." };
}

export async function upsertServiceCategory(prevState: any, formData: FormData) {
  const supabase = await createClient();

  const type = formData.get("type") as string;
  const column = formData.get("column") as string;
  const sort_order_str = formData.get("sortOrder") as string;
  const label = formData.get("label") as string;
  const db_category = formData.get("dbCategory") as string;
  const category_key = formData.get("categoryKey") as string;
  const depends_on = formData.get("dependsOn") as string;

  const sort_order = parseInt(sort_order_str, 10);

  if (
    !type ||
    !column ||
    !label ||
    !db_category ||
    !category_key ||
    isNaN(sort_order)
  ) {
    return {
      error:
        "All category fields (Type, Column, Label, DB Category, Key, Sort Order) are required.",
    };
  }

  try {
    const upsertData = {
      type,
      column,
      sort_order,
      label,
      db_category,
      category_key,
      depends_on: depends_on || null,
    };

    const { error: upsertError } = await supabase
      .from("ServiceCategories")
      .upsert(upsertData, { onConflict: "db_category" });

    if (upsertError) {
      return {
        error: "Failed to save service category: " + upsertError.message,
      };
    }

    revalidatePath("/services");
    return { success: "Service category saved successfully" };
  } catch (error) {
    return {
      error: "An unexpected error occurred: " + (error as Error).message,
    };
  }
}

// Helper function to get available sort orders for a column
export async function getAvailableSortOrders(
  column: string
): Promise<number[]> {
  const supabase = await createClient();

  const { data: usedOrders, error } = await supabase
    .from("ServiceCategories")
    .select("sort_order")
    .eq("column", column);

  if (error) {
    console.error("Error fetching used sort orders:", error);
    return [];
  }

  const usedOrdersSet = new Set(
    usedOrders?.map((item) => item.sort_order) || []
  );
  const availableOrders: number[] = [];

  // Generate available sort orders in increments of 10
  for (let i = 10; i <= 100; i += 10) {
    if (!usedOrdersSet.has(i)) {
      availableOrders.push(i);
    }
  }

  return availableOrders;
}

// Helper function to get service categories by service ID
export async function getServiceCategories() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ServiceCategories")
    .select("*")
    .order("sort_order");

  if (error) {
    console.error("Error fetching service categories:", error);
    return [];
  }

  return data || [];
}

export const verifyAppointment = async (
  appointmentId: string
): Promise<{ success?: string; error?: string }> => {
  const supabase = await createClient();

  // Check if the user is an admin
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.isAdmin) {
    return { error: "Unauthorized: Admin access required." };
  }

  // First, update the appointment status to 'verified'
  const { data: updatedAppointment, error: updateError } = await supabase
    .from("Appointments")
    .update({ status: "verified" })
    .eq("id", appointmentId)
    .select()
    .single();

  if (updateError) {
    return { error: `Failed to update appointment: ${updateError.message}` };
  }

  let smsResult: { success: boolean; error?: string } = { success: true };
  if (updatedAppointment.Phone) {
    // Send immediate confirmation SMS
    const confirmationSmsMessage = getSmsContent(
      "confirmation",
      updatedAppointment
    );
    smsResult = await sendSms(updatedAppointment.Phone, confirmationSmsMessage);
  }

  let emailResult: { success: boolean; error?: string } = { success: true };
  if (updatedAppointment.Email) {
    // Send immediate confirmation email
    emailResult = await sendBrevoEmail("confirmation", updatedAppointment);
  }

  // Calculate reminder time (2 hours before appointment)
  const appointmentDateTime = new Date(
    `${updatedAppointment.Date}T${updatedAppointment.Time}`
  );
  const reminderDateTime = new Date(
    appointmentDateTime.getTime() - 2 * 60 * 60 * 1000
  );

  // Only schedule reminders if the appointment is more than 2 hours away
  let scheduledSmsResult = { success: true };
  let scheduledEmailResult = { success: true };

  if (reminderDateTime > new Date()) {
    if (updatedAppointment.Phone) {
      // Schedule reminder SMS
      const reminderSmsMessage = getSmsContent("reminder", updatedAppointment);
      // Format for SMS API: "Y-m-d H:i" format
      const smsSchedule = formatDateTimeForSMS(reminderDateTime);
      scheduledSmsResult = await sendSms(
        updatedAppointment.Phone,
        reminderSmsMessage,
        smsSchedule
      );
    }

    if (updatedAppointment.Email) {
      // Schedule reminder email
      scheduledEmailResult = await sendBrevoEmail(
        "reminder",
        updatedAppointment,
        reminderDateTime.toISOString()
      );
    }
  }

  // Collect results
  const results = [
    smsResult,
    emailResult,
    scheduledSmsResult,
    scheduledEmailResult,
  ];
  const errors = results.filter((r) => !r.success).map((r) => r.error);

  if (errors.length > 0) {
    return {
      success: `Appointment verified, but some notifications failed: ${errors.join(
        ", "
      )}`,
    };
  }

  revalidatePath("/"); // Revalidate the dashboard to reflect the change
  return {
    success:
      "Appointment verified. Confirmation and reminders for SMS/Email have been sent/scheduled.",
  };
};

export const rejectAppointment = async (
  appointmentId: string
): Promise<{ success?: string; error?: string }> => {
  const supabase = await createClient();

  // Check if the user is an admin
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { error: "Authentication required." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.isAdmin) {
    return { error: "Unauthorized: Admin access required." };
  }

  // Fetch the appointment to get details for the notification email
  const { data: appointmentToReject, error: fetchError } = await supabase
    .from("Appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (fetchError || !appointmentToReject) {
    return {
      error: `Could not find appointment to reject: ${fetchError?.message}`,
    };
  }

  // Update the appointment status to 'failed'
  const { error: updateError } = await supabase
    .from("Appointments")
    .update({ status: "failed" })
    .eq("id", appointmentId);
  if (updateError) {
    return { error: `Failed to reject appointment: ${updateError.message}` };
  }

  await sendBrevoEmail("cancellation", appointmentToReject);
  revalidatePath("/");
  return { success: "Appointment has been rejected." };
};

// Helper function to format date for SMS API
function formatDateTimeForSMS(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function getSmsContent(smsType: string, appointment: any) {
  const formatDate = (dateStr: any) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };
  const formatTime = (timeStr: any) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  switch (smsType) {
    case "confirmation":
      return `Glowpoint: Hello ${
        appointment.Name
      }! Your appointment on ${formatDate(appointment.Date)} at ${formatTime(
        appointment.Time
      )} is confirmed! Remaining balance: P${(appointment.Total || 0).toFixed(
        2
      )}. Please arrive on time. We look forward to seeing you!`;
    case "reminder":
      return `Glowpoint Reminder: Your appointment is in 2 hours at ${formatTime(
        appointment.Time
      )}. Please be on time. See you soon! Don't forget to check https://glowpoint.org to leave your feedback after the appointment!`;
    case "now_serving":
      return `Glowpoint: Hi! It's your turn soon! Your queue number is ${appointment.position}. Please proceed to the counter in 5-10 minutes.`;
    default:
      return "";
  }
}

async function sendSms(
  phone: string,
  message: string,
  schedule?: string
): Promise<{ success: boolean; error?: string }> {
  const apiToken = process.env.SMS_API_KEY;
  if (!apiToken) {
    console.error("SMS_API_KEY is not set.");
    return { success: false, error: "SMS service is not configured." };
  }

  let phoneNumber = phone.replace(/[\s\-()]/g, ""); // Remove spaces, hyphens, parentheses

  if (phoneNumber.startsWith("+63")) {
    phoneNumber = "0" + phoneNumber.substring(3);
  } else if (phoneNumber.startsWith("63")) {
    phoneNumber = "0" + phoneNumber.substring(2);
  } else if (!phoneNumber.startsWith("0")) {
    phoneNumber = "0" + phoneNumber;
  }

  const isScheduled = !!schedule;
  const endpoint = isScheduled
    ? "https://sms.iprogtech.com/api/v1/message-reminders"
    : "https://sms.iprogtech.com/api/v1/sms_messages";

  const payload: {
    api_token: string;
    phone_number: string;
    message: string;
    scheduled_at?: string;
    sms_provider?: number;
    sender_name?: string;
  } = {
    api_token: apiToken,
    phone_number: phoneNumber,
    message: message,
    sms_provider: 2,
  };

  payload.sender_name = "Elaiza G. Beauty";
  if (schedule) {
    payload.scheduled_at = schedule;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SMS API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `Failed to send SMS: ${errorText}`,
      };
    }

    await response.json(); // Consume the JSON body to prevent memory leaks
    return { success: true };
  } catch (error: any) {
    console.error("Failed to send SMS:", error);
    return { success: false, error: error.message };
  }
}

function getEmailContent(emailType: string, appointment: any) {
  const formatDate = (dateStr: any) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };
  const formatTime = (timeStr: any) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  const servicesList = Array.isArray(appointment.Services)
    ? appointment.Services.join(", ")
    : appointment.Services || "Not specified";
  switch (emailType) {
    case "confirmation":
      return {
        subject: "Your Appointment is Confirmed!",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d97706; margin-bottom: 10px;">Appointment Confirmed!</h1>
              <p style="color: #92400e; font-size: 16px;">We're excited to pamper you!</p>
            </div>

            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fbbf24;">
              <h2 style="color: #92400e; margin-top: 0;">Your Appointment Details</h2>

              <div style="margin: 15px 0;">
                <strong style="color: #92400e;">Name:</strong> ${
                  appointment.Name
                }<br>
                <strong style="color: #92400e;">Date:</strong> ${formatDate(
                  appointment.Date
                )}<br>
                <strong style="color: #92400e;">Time:</strong> ${formatTime(
                  appointment.Time
                )}<br>
                <strong style="color: #92400e;">Services:</strong> ${servicesList}<br>
                <strong style="color: #92400e;">Total:</strong> ₱${(
                  appointment.Total || 0
                ).toFixed(2)}
              </div>
            </div>

            <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <h3 style="color: #1e40af; margin-top: 0;">Payment Information</h3>
              <p style="color: #1e3a8a; margin: 5px 0;">Appointment fee (₱100) - Paid online</p>
              <p style="color: #1e3a8a; margin: 5px 0;">Remaining balance (₱${Math.max(
                0,
                appointment.Total || 0
              ).toFixed(2)}) - Pay at venue</p>
            </div>

            <div style="background-color: #ecfccb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #365314; margin: 0;"><strong>Location:</strong> NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan</p>
              <p style="color: #365314; margin: 5px 0;"><strong>Contact:</strong> 09300784517</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #92400e; font-size: 14px;">Please arrive early as to not void the appointment! .</p>
              <p style="color: #d97706; font-weight: bold;">We can't wait to see you!</p>
            </div>
          </div>
        `,
        textContent: `Your Beauty Appointment is Confirmed!\n\nAppointment Details:\n- Name: ${
          appointment.Name
        }\n- Date: ${formatDate(appointment.Date)}\n- Time: ${formatTime(
          appointment.Time
        )}\n- Services: ${servicesList}\n- Total: ₱${(
          appointment.Total || 0
        ).toFixed(
          2
        )}\n\nPayment Information:\n- Appointment fee (₱100) - Paid online\n- Remaining balance (₱${Math.max(
          0,
          appointment.Total || 0
        ).toFixed(
          2
        )}) - Pay at venue\n\nLocation: NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan\nContact: 09300784517\n\nPlease arrive early as to not void the appointment! .\nWe can't wait to see you!`,
      };
    case "reminder":
      return {
        subject: "Reminder: Your beauty appointment is in 2 hours!",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d97706; margin-bottom: 10px;">Appointment Reminder</h1>
              <p style="color: #92400e; font-size: 16px;">Your beauty session is in 2 hours!</p>
            </div>

            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fbbf24;">
              <h2 style="color: #92400e; margin-top: 0;">Quick Details</h2>
              <div style="margin: 15px 0;">
                <strong style="color: #92400e;">Today at:</strong> ${formatTime(
                  appointment.Time
                )}<br>
                <strong style="color: #92400e;">Services:</strong> ${servicesList}<br>
                <strong style="color: #92400e;">Balance to pay:</strong> ₱${Math.max(
                  0,
                  appointment.Total || 0
                ).toFixed(2)}
              </div>
            </div>

            <div style="background-color: #ecfccb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="color: #365314; margin: 0;"><strong>Address:</strong> NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan</p>
              <p style="color: #365314; margin: 5px 0;"><strong>Questions?</strong> 09300784517</p>
            </div>

            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #92400e; font-size: 14px;">
                Please arrive on time! After 15 minutes of being late, the appointment may be considered void.
              </p>
              <p style="color: #d97706; font-weight: bold;">See you soon!</p>
              <p style="color: #92400e; font-size: 12px; margin-top: 20px;">Don't forget to check <a href="https://glowpoint.org" style="color: #1e40af;">glowpoint.org</a> to leave your feedback after the appointment!</p>
            </div>
          </div>
        `,
        textContent: `Appointment Reminder - Your beauty session is in 2 hours!\n\nDetails:\n- Today at: ${formatTime(
          appointment.Time
        )}\n- Services: ${servicesList}\n- Balance to pay: ₱${Math.max(
          0,
          appointment.Total || 0
        ).toFixed(
          2
        )}\n\nLocation: NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan\nContact: 09300784517\n\nPlease arrive on time! After 15 minutes of being late, the appointment may be considered void.`,
      };
    case "cancellation":
      return {
        subject: "Appointment Cancelled",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #dc2626; margin-bottom: 10px;">Appointment Cancelled</h1>
            </div>
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fca5a5;">
              <p>Hi ${appointment.Name},</p>
              <p>We're writing to inform you that your appointment scheduled for <strong>${formatDate(
                appointment.Date
              )}</strong> at <strong>${formatTime(
          appointment.Time
        )}</strong> has been cancelled.</p>
              <p>If you did not request this cancellation, please contact us. We hope to see you again soon!</p>
            </div>
          </div>
        `,
        textContent: `Hi ${
          appointment.Name
        },\n\nYour appointment scheduled for ${formatDate(
          appointment.Date
        )} at ${formatTime(
          appointment.Time
        )} has been cancelled.\n\nWe hope to see you again soon!`,
      };
    case "reschedule":
      return {
        subject: "Appointment Rescheduled",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d97706; margin-bottom: 10px;">Appointment Rescheduled</h1>
            </div>
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fbbf24;">
              <p>Hi ${appointment.Name},</p>
              <p>This is a confirmation that your appointment has been successfully rescheduled. Your new appointment details are:</p>
              <p><strong>Date:</strong> ${formatDate(appointment.Date)}<br>
                 <strong>Time:</strong> ${formatTime(appointment.Time)}</p>
              <p>We look forward to seeing you!</p>
            </div>
          </div>
        `,
        textContent: `Hi ${
          appointment.Name
        },\n\nYour appointment has been rescheduled to ${formatDate(
          appointment.Date
        )} at ${formatTime(
          appointment.Time
        )}.\n\nWe look forward to seeing you!`,
      };
    case "now_serving":
      return {
        subject: "It's Your Turn at Glowpoint!",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d97706; margin-bottom: 10px;">It's Your Turn!</h1>
            </div>
            <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fbbf24; text-align: center;">
              <p style="font-size: 18px;">Hi ${appointment.Name}, your queue number is now being called!</p>
              <p style="font-size: 48px; font-weight: bold; color: #d97706; margin: 20px 0;">#${appointment.position}</p>
              <p style="font-size: 18px;">Please proceed to the counter.</p>
            </div>
          </div>
        `,
        textContent: `Hi ${appointment.Name}, it's your turn! Your queue number is #${appointment.position}. Please proceed to the counter.`,
      };
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }
}

async function sendBrevoEmail(
  emailType: string,
  appointment: any,
  scheduleAt?: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const brevoApiKey = process.env.BREVO_API_KEY;

  if (!brevoApiKey) {
    return { success: false, error: "Brevo API key not configured." };
  }

  const emailContent = getEmailContent(emailType, appointment);

  const emailData = {
    to: [{ email: appointment.Email, name: appointment.Name }],
    sender: {
      name: "Elaiza G. Beauty Lounge",
      email: "glowpointcapstone@gmail.com",
    },
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
    textContent: emailContent.textContent,
  };

  if (scheduleAt) {
    (emailData as any).scheduledAt = scheduleAt;
  }

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Brevo API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json();
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    return { success: false, error: `Failed to send email: ${error.message}` };
  }
}

interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface QueueEntry {
  id: number;
  user_id: string;
  position: number;
  estimated_wait_time: number;
  qr_code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email: string;
  phone: string;
}

export interface QueueSettings {
  id: number;
  current_serving: number;
  is_active: boolean;
  last_reset: string;
  updated_at: string;
}
// Get current queue state
export const getAdminQueueState = async (): Promise<
  ActionResult<{
    queue: QueueEntry[];
    currentServing: number;
  }>
> => {
  try {
    const supabase = await createClient();
    const [queueResponse, settingsResponse] = await Promise.all([
      supabase
        .from("queue_entries")
        .select("*")
        .eq("is_active", true)
        .order("position", { ascending: true }),
      supabase.from("queue_settings").select("*").eq("id", 1).single(),
    ]);

    if (queueResponse.error) throw queueResponse.error;
    if (settingsResponse.error) throw settingsResponse.error;

    const decryptedQueue = (queueResponse.data || []).map((entry) => ({
      ...entry,
      email: entry.email ? decryptData(entry.email) : entry.email,
      phone: entry.phone ? decryptData(entry.phone) : entry.phone,
    }));

    return {
      success: true,
      data: {
        queue: decryptedQueue,
        currentServing: settingsResponse.data?.current_serving || 0,
      },
    };
  } catch (error: any) {
    console.error("Error fetching queue state:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const advanceQueue = async (): Promise<
  ActionResult<{ currentServing: number }>
> => {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get current settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("queue_settings")
      .select("current_serving")
      .eq("id", 1)
      .single();

    if (settingsError) throw settingsError;

    // Find the user to be served (position 1)
    const { data: userToServe, error: userToServeError } = await supabaseAdmin
      .from("queue_entries")
      .select("*")
      .eq("is_active", true)
      .eq("position", 1)
      .single();

    if (userToServeError && userToServeError.code !== "PGRST116") {
      throw userToServeError;
    }

    if (userToServe) {
      // Fetch the profile separately using the user_id
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("Profiles")
        .select("username")
        .eq("id", userToServe.user_id)
        .single();

      if (profileError) {
        // Log the error but don't block the queue advancement
        console.error("Error fetching profile for notification:", profileError);
      }

      const appointmentDataForNotif = {
        Name: profile?.username || "Valued Customer",
        Email: userToServe.email ? decryptData(userToServe.email) : "",
        Phone: userToServe.phone ? decryptData(userToServe.phone) : "",
        position: userToServe.position,
      };

      // Send notifications
      if (appointmentDataForNotif.Email) {
        await sendBrevoEmail("now_serving", appointmentDataForNotif);
      }
      if (appointmentDataForNotif.Phone) {
        await sendSms(
          appointmentDataForNotif.Phone,
          getSmsContent("now_serving", appointmentDataForNotif)
        );
      }

      // Deactivate the served user
      const { error: deactivateError } = await supabaseAdmin
        .from("queue_entries")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", userToServe.id);

      if (deactivateError) throw deactivateError;
    }

    const newCurrentServing = (settings.current_serving || 0) + 1;

    // Update current serving number
    const { error: updateError } = await supabaseAdmin
      .from("queue_settings")
      .update({
        current_serving: newCurrentServing,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) throw updateError;

    // Get all active queue entries and update their positions
    const { data: activeQueue, error: queueError } = await supabaseAdmin
      .from("queue_entries")
      .select("*")
      .eq("is_active", true)
      .order("position");

    if (queueError) throw queueError;

    // Update positions and wait times for remaining entries
    // Filter out the user who was just served, if they are still in the list
    const remainingQueue = activeQueue.filter(
      (entry) => entry.id !== userToServe?.id
    );

    if (remainingQueue.length > 0) {
      const updates = remainingQueue.map((entry, index) => ({
        id: entry.id,
        user_id: entry.user_id, // Preserve the user_id
        qr_code: entry.qr_code,
        position: index + 1,
        estimated_wait_time: Math.max(0, (index + 1) * 20),
        updated_at: new Date().toISOString(),
      }));

      const { error: batchError } = await supabaseAdmin
        .from("queue_entries")
        .upsert(updates);

      if (batchError) throw batchError;
    }

    return {
      success: true,
      data: { currentServing: newCurrentServing },
    };
  } catch (error: any) {
    console.error("Error advancing queue:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const notifyNextInQueue = async (): Promise<ActionResult<null>> => {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the user at the front of the queue
    const { data: nextUser, error: fetchError } = await supabaseAdmin
      .from("queue_entries")
      .select("*")
      .eq("is_active", true)
      .eq("position", 1)
      .single();

    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return { success: false, error: "Queue is empty." };
      }
      throw fetchError;
    }

    if (!nextUser) {
      return { success: false, error: "No one is next in the queue." };
    }

    const { data: profile } = await supabaseAdmin
      .from("Profiles")
      .select("username")
      .eq("id", nextUser.user_id)
      .single();

    const notificationData = {
      Name: profile?.username || "Valued Customer",
      Email: nextUser.email ? decryptData(nextUser.email) : "",
      Phone: nextUser.phone ? decryptData(nextUser.phone) : "",
      position: nextUser.position,
    };

    if (notificationData.Phone) {
      await sendSms(
        notificationData.Phone,
        getSmsContent("now_serving", notificationData)
      );
    }

    if (notificationData.Email) {
      await sendBrevoEmail("now_serving", notificationData);
    }

    return { success: true, data: null };
  } catch (error: any) {
    console.error("Error notifying next in queue:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};
// Reset queue (end of day)
export const resetQueue = async (): Promise<
  ActionResult<{ message: string }>
> => {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Deactivate all current queue entries and reset serving number
    const [deactivateResult, resetSettingsResult] = await Promise.all([
      supabaseAdmin
        .from("queue_entries")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("is_active", true),
      supabaseAdmin
        .from("queue_settings")
        .update({
          current_serving: 0,
          last_reset: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1),
    ]);

    if (deactivateResult.error) throw deactivateResult.error;
    if (resetSettingsResult.error) throw resetSettingsResult.error;

    return {
      success: true,
      data: { message: "Queue reset successfully" },
    };
  } catch (error: any) {
    console.error("Error resetting queue:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get queue statistics
export const getQueueStats = async (): Promise<
  ActionResult<{
    totalToday: number;
    averageWaitTime: number;
    currentQueueLength: number;
  }>
> => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const supabase = await createClient();
    const [totalTodayResult, activeQueueResult] = await Promise.all([
      supabase
        .from("queue_entries")
        .select("id")
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lte("created_at", `${today}T23:59:59.999Z`),
      supabase
        .from("queue_entries")
        .select("estimated_wait_time")
        .eq("is_active", true),
    ]);

    if (totalTodayResult.error) throw totalTodayResult.error;
    if (activeQueueResult.error) throw activeQueueResult.error;

    const totalToday = totalTodayResult.data?.length || 0;
    const activeQueue = activeQueueResult.data || [];
    const currentQueueLength = activeQueue.length;
    const averageWaitTime =
      activeQueue.length > 0
        ? Math.round(
            activeQueue.reduce(
              (sum, entry) => sum + entry.estimated_wait_time,
              0
            ) / activeQueue.length
          )
        : 0;

    return {
      success: true,
      data: {
        totalToday,
        averageWaitTime,
        currentQueueLength,
      },
    };
  } catch (error: any) {
    console.error("Error fetching queue stats:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

export const clearActivity = async (
  ids: string[] | "all"
): Promise<{ success?: boolean; error?: string }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("Profiles")
    .select("isAdmin")
    .eq("id", user.id)
    .single();

  if (!profile?.isAdmin) {
    return { error: "Unauthorized: Admin access required." };
  }

  try {
    let query = supabase
      .from("Appointments")
      .update({ is_cleared: true })
      .eq("status", "assigned")
      .eq("is_cleared", false);

    // If specific IDs provided, only clear those
    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    }
    // If "all", clear all non-cleared assigned appointments (no additional filter needed)

    const { error } = await query;

    if (error) {
      console.error("Error clearing activity:", error);
      return { error: "Failed to clear activity." };
    }

    revalidatePath("/home");
    return { success: true };
  } catch (error: any) {
    console.error("Unexpected error clearing activity:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
};

export async function clearFeedback(ids: string[] | "all") {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Authentication required." };
  }

  try {
    let query = supabase
      .from("Feedback")
      .update({ is_cleared: true })
      .eq("is_cleared", false);

    if (Array.isArray(ids) && ids.length > 0) {
      query = query.in("id", ids);
    }

    const { error } = await query;

    if (error) {
      console.error("Error clearing feedback:", error);
      return { error: "Failed to clear feedback." };
    }

    revalidatePath("/home");
    return { success: "All feedback has been cleared." };
  } catch (error: any) {
    console.error("Unexpected error clearing feedback:", error);
    return { error: error.message || "An unexpected error occurred." };
  }
}

export async function migrateToEncryptedData() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: profiles, error } = await supabaseAdmin
    .from("Profiles")
    .select("id, phone, location, email");

  if (error) {
    console.error("Error fetching profiles:", error);
    return { error: "Failed to fetch profiles for migration." };
  }

  if (!profiles) {
    return { success: "No profiles found to migrate." };
  }

  let updatedCount = 0;
  const errors = [];

  for (const profile of profiles) {
    const { id, phone, location, email } = profile;
    let needsUpdate = false;
    const updatePayload: { phone?: string; location?: string ; email?:string} = {};

    // Check phone
    if (phone && decryptData(phone) === phone) {
      // If decrypting returns the original value, it's unencrypted
      updatePayload.phone = encryptData(phone);
      needsUpdate = true;
    }

    // Check location
    if (location && decryptData(location) === location) {
      updatePayload.location = encryptData(location);
      needsUpdate = true;
    }

    // Check email
    if (profile.email && decryptData(profile.email) === profile.email) {
      updatePayload.email = encryptData(profile.email);
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("Profiles")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        console.error(`Failed to update profile ${id}:`, updateError);
        errors.push({ id, message: updateError.message });
      } else {
        updatedCount++;
      }
    }
  }

  return {
    success: `Migration complete. Updated ${updatedCount} profiles.`,
    errors,
  };
}

export async function migrateAppointmentsToEncryptedData() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: appointments, error } = await supabaseAdmin
    .from("Appointments")
    .select("id, Phone, Email");

  if (error) {
    console.error("Error fetching appointments:", error);
    return { error: "Failed to fetch appointments for migration." };
  }

  if (!appointments) {
    return { success: "No appointments found to migrate." };
  }

  let updatedCount = 0;
  const errors = [];

  for (const appointment of appointments) {
    const { id, Phone, Email } = appointment;
    let needsUpdate = false;
    const updatePayload: { Phone?: string; Email?: string } = {};

    // Check Phone
    if (Phone && decryptData(Phone) === Phone) {
      updatePayload.Phone = encryptData(Phone);
      needsUpdate = true;
    }

    // Check Email
    if (Email && decryptData(Email) === Email) {
      updatePayload.Email = encryptData(Email);
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("Appointments")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        console.error(`Failed to update appointment ${id}:`, updateError);
        errors.push({ id, message: updateError.message });
      } else {
        updatedCount++;
      }
    }
  }

  return {
    success: `Migration complete. Updated ${updatedCount} appointments.`,
    errors,
  };
}

export async function migrateQueueToEncryptedData() {
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  const { data: queueEntries, error } = await supabaseAdmin
    .from("queue_entries")
    .select("id, phone, email");

  if (error) {
    console.error("Error fetching queue entries:", error);
    return { error: "Failed to fetch queue entries for migration." };
  }

  if (!queueEntries) {
    return { success: "No queue entries found to migrate." };
  }

  let updatedCount = 0;
  const errors = [];

  for (const entry of queueEntries) {
    const { id, phone, email } = entry;
    let needsUpdate = false;
    const updatePayload: { phone?: string; email?: string } = {};

    // Check phone
    if (phone && decryptData(phone) === phone) {
      updatePayload.phone = encryptData(phone);
      needsUpdate = true;
    }

    // Check email
    if (email && decryptData(email) === email) {
      updatePayload.email = encryptData(email);
      needsUpdate = true;
    }

    if (needsUpdate) {
      const { error: updateError } = await supabaseAdmin
        .from("queue_entries")
        .update(updatePayload)
        .eq("id", id);

      if (updateError) {
        console.error(`Failed to update queue entry ${id}:`, updateError);
        errors.push({ id, message: updateError.message });
      } else {
        updatedCount++;
      }
    }
  }

  return {
    success: `Migration complete. Updated ${updatedCount} queue entries.`,
    errors,
  };
}

export async function fetchPendingAppointments() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("Appointments")
    .select("*")
    .eq("status", "pending")
    .order("date_created", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Error fetching appointments:", error);
    return { data: null, error: error.message };
  }

  // Decrypt sensitive data on the server
  const decryptedAppointments = (data || []).map((appointment) => ({
    ...appointment,
    Phone: appointment.Phone ? decryptData(appointment.Phone) : appointment.Phone,
    Email: appointment.Email ? decryptData(appointment.Email) : appointment.Email,
  }));

  return { data: decryptedAppointments, error: null };
}
