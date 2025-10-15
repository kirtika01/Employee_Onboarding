import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  fullName: string;
  department: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, department }: ConfirmationEmailRequest = await req.json();

    console.log("Sending confirmation email to:", email);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Use Resend REST API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Employee Management <onboarding@resend.dev>",
        to: [email],
        subject: "Welcome to the Team! Registration Confirmed",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #4F46E5; border-bottom: 3px solid #4F46E5; padding-bottom: 10px;">
              Welcome to Employee Management System
            </h1>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Dear <strong>${fullName}</strong>,
            </p>
            
            <p style="font-size: 16px; line-height: 1.6;">
              Your registration has been successfully confirmed! You have been added to the 
              <strong style="color: #4F46E5;">${department}</strong> department.
            </p>
            
            <div style="background-color: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="color: #1F2937; margin-top: 0;">Next Steps:</h2>
              <ul style="line-height: 1.8; color: #4B5563;">
                <li>Log in to your dashboard to upload required documents</li>
                <li>Check for any assignments from your admin</li>
                <li>Complete your profile information</li>
                <li>Review department-specific resources</li>
              </ul>
            </div>
            
            <p style="font-size: 16px; line-height: 1.6;">
              If you have any questions, please don't hesitate to reach out to your department admin.
            </p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
              Best regards,<br>
              <strong>The HR Team</strong>
            </p>
            
            <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #6B7280; text-align: center;">
              This is an automated message. Please do not reply to this email.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();
    console.log("Email sent successfully:", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
