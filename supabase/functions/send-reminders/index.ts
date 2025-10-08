// supabase/functions/send-reminders/index.ts

import { createClient } from 'npm:@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Define the structure for your appointment data
interface Appointment {
  id: string;
  Name: string;
  Email: string;
  Date: string;
  Time: string;
  Services: any;
  Total: number;
}

// This function is copied from your actions.ts file
function getEmailContent(emailType: string, appointment: Appointment) {
  const formatDate = (dateStr: any) => new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatTime = (timeStr: any) => new Date(`2000-01-01T${timeStr}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const servicesList = Array.isArray(appointment.Services) ? appointment.Services.join(", ") : appointment.Services || "Not specified";

  switch (emailType) {
    case "reminder":
      return {
        subject: "Reminder: Your beauty appointment is in 2 hours!",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fef3c7; padding: 20px; border-radius: 10px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #d97706;">Appointment Reminder</h1>
              <p style="color: #92400e; font-size: 18px; font-weight: bold;">Your beauty session is in 2 hours!</p>
            </div>
            <div style="background-color: white; padding: 20px; border-radius: 8px; border: 2px solid #fbbf24;">
              <h2 style="color: #92400e; margin-top: 0;">Quick Details</h2>
              <p><strong>Today at:</strong> ${formatTime(appointment.Time)}</p>
              <p><strong>Services:</strong> ${servicesList}</p>
              <p><strong>Balance to pay:</strong> ₱${Math.max(0, appointment.Total || 0).toFixed(2)}</p>
            </div>
            <div style="text-align: center; margin-top: 20px; padding: 15px; background-color: #dbeafe; border-radius: 8px;">
              <p style="color: #1e40af; margin: 0; font-weight: bold;">Pro Tip: After 15 minutes of being late, the appointment can be considered void, be sure to arrive on time!</p>
            </div>
          </div>`,
      };
    // Add other email types like 'confirmation' if needed
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }
}

// This function is also adapted from your actions.ts file
async function sendBrevoEmail(emailType: string, appointment: Appointment) {
  const brevoApiKey = Deno.env.get('BREVO_API_KEY');
  if (!brevoApiKey) {
    console.error("BREVO_API_KEY is not set.");
    return { success: false, error: "Brevo API key not configured." };
  }

  const emailContent = getEmailContent(emailType, appointment);
  const emailData = {
    to: [{ email: appointment.Email, name: appointment.Name }],
    sender: { name: "Elaiza G. Beauty Lounge", email: "glowpointcapstone@gmail.com" },
    subject: emailContent.subject,
    htmlContent: emailContent.htmlContent,
  };

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify(emailData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Brevo API error: ${response.status} - ${errorText}` };
  }
  return { success: true };
}

// This is the main logic from your sendAppointmentReminders action
async function sendReminders() {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const now = new Date();
  const reminderWindowStart = new Date(now.getTime() + 115 * 60 * 1000); // 1h 55m
  const reminderWindowEnd = new Date(now.getTime() + 125 * 60 * 1000);   // 2h 5m

  const { data: appointments, error: fetchError } = await supabase
    .from("Appointments")
    .select("*")
    .eq("status", "verified")
    .gte("Date", now.toISOString().split("T")[0]); // Only fetch appointments for today or later

  if (fetchError) {
    throw new Error(`Error fetching appointments: ${fetchError.message}`);
  }

  const upcomingAppointments = appointments.filter((app: Appointment) => {
    const appointmentDateTime = new Date(`${app.Date}T${app.Time}`);
    return appointmentDateTime >= reminderWindowStart && appointmentDateTime <= reminderWindowEnd;
  });

  if (upcomingAppointments.length === 0) {
    return { success: true, sent: 0, errors: [] };
  }

  const results = await Promise.all(
    upcomingAppointments.map((app: Appointment) => sendBrevoEmail("reminder", app))
  );

  const sentCount = results.filter((r) => r.success).length;
  const errorMessages = results.filter((r) => !r.success).map((r) => r.error || "Unknown email error");

  return { success: errorMessages.length === 0, sent: sentCount, errors: errorMessages };
}

// This is the entry point for the edge function
serve(async (req) => {
  try {
    const result = await sendReminders();
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
