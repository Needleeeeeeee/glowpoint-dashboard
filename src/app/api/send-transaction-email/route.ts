import { NextRequest, NextResponse } from 'next/server';

const BREVO_API_KEY = process.env.BREVO_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!BREVO_API_KEY) {
      return NextResponse.json(
        { error: 'Brevo API key not configured' },
        { status: 500 }
      );
    }

    const { emailType, appointment } = await request.json();

    // Validate required fields
    if (!appointment || !appointment.Email) {
      return NextResponse.json(
        { error: 'Appointment data with email is required' },
        { status: 400 }
      );
    }

    // Prepare email content
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const formatTime = (timeStr: string) => {
      return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };

    const servicesList = Array.isArray(appointment.Services)
      ? appointment.Services.join(', ')
      : appointment.Services || 'Not specified';

    const emailData = {
      to: [{
        email: appointment.Email,
        name: appointment.Name || 'Customer'
      }],
      sender: {
        name: "Elaiza G. Beauty Lounge",
        email: "glowpointcapstone@gmail.com"
      },
      subject: 'Your Appointment is Confirmed!',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #fffbeb; padding: 20px; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin-bottom: 10px;">Appointment Confirmed!</h1>
            <p style="color: #92400e; font-size: 16px;">We're excited to pamper you!</p>
          </div>

          <div style="background-color: white; padding: 25px; border-radius: 8px; border: 2px solid #fbbf24;">
            <h2 style="color: #92400e; margin-top: 0;">Your Appointment Details</h2>

            <div style="margin: 15px 0;">
              <strong style="color: #92400e;">Name:</strong> ${appointment.Name}<br>
              <strong style="color: #92400e;">Date:</strong> ${formatDate(appointment.Date)}<br>
              <strong style="color: #92400e;">Time:</strong> ${formatTime(appointment.Time)}<br>
              <strong style="color: #92400e;">Services:</strong> ${servicesList}<br>
              <strong style="color: #92400e;">Total:</strong> ₱${(appointment.Total || 0).toFixed(2)}
            </div>
          </div>

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
            <h3 style="color: #1e40af; margin-top: 0;">Payment Information</h3>
            <p style="color: #1e3a8a; margin: 5px 0;">Appointment fee (₱100) - Paid online</p>
            <p style="color: #1e3a8a; margin: 5px 0;">Remaining balance (₱${Math.max(0, (appointment.Total || 0) - 100).toFixed(2)}) - Pay at venue</p>
          </div>

          <div style="background-color: #ecfccb; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #365314; margin: 0;"><strong>Location:</strong> NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan</p>
            <p style="color: #365314; margin: 5px 0;"><strong>Contact:</strong> 09300784517</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #92400e; font-size: 14px;">Can't make it? Please cancel at least 24 hours in advance to avoid cancellation fees.</p>
            <p style="color: #d97706; font-weight: bold;">We can't wait to see you!</p>
          </div>
        </div>
      `,
      textContent: `Your Beauty Appointment is Confirmed!\n\nAppointment Details:\n- Name: ${appointment.Name}\n- Date: ${formatDate(appointment.Date)}\n- Time: ${formatTime(appointment.Time)}\n- Services: ${servicesList}\n- Total: ₱${(appointment.Total || 0).toFixed(2)}\n\nPayment Information:\n- Appointment fee (₱100) - Paid online\n- Remaining balance (₱${Math.max(0, (appointment.Total || 0) - 100).toFixed(2)}) - Pay at venue\n\nLocation: NSCI Building, Km. 37 Pulong Buhangin, Santa Maria, Bulacan\nContact: 09300784517\n\nCan't make it? Please cancel at least 24 hours in advance to avoid cancellation fees.\nWe can't wait to see you!`
    };

    // Send email via Brevo API
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Brevo API error:', errorText);
      return NextResponse.json(
        { error: `Failed to send email: ${response.status}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      messageId: result.messageId
    });

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
