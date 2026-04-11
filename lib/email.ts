import { Resend } from "resend";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface EmailServiceResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

// Standalone export used by API routes
export async function sendEmail(params: SendEmailParams): Promise<EmailServiceResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { success: false, error: "RESEND_API_KEY not configured" };
  const resend = new Resend(apiKey);
  const defaultFrom = process.env.EMAIL_FROM || "noreply@authmanagerpro.com";
  try {
    const response = await resend.emails.send({
      from: params.from || defaultFrom,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
    });
    if (response.error) return { success: false, error: response.error.message };
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error" };
  }
}

export async function sendVerificationEmail(email: string, fullName: string): Promise<EmailServiceResult> {
  return sendEmail({
    to: email,
    subject: "Verifica tu email - AuthManagerPro",
    html: `<h2>Hola ${fullName}</h2><p>Verifica tu email haciendo click en el link enviado por Supabase.</p>`,
  });
}

export async function sendApprovalEmail(email: string, fullName: string): Promise<EmailServiceResult> {
  return sendEmail({
    to: email,
    subject: "Tu cuenta ha sido aprobada - AuthManagerPro",
    html: `<h2>Hola ${fullName}</h2><p>Tu cuenta ha sido aprobada. Ya podés acceder a la plataforma.</p>`,
  });
}

export async function sendRejectionEmail(email: string, fullName: string, reason?: string): Promise<EmailServiceResult> {
  return sendEmail({
    to: email,
    subject: "Estado de tu cuenta - AuthManagerPro",
    html: `<h2>Hola ${fullName}</h2><p>Tu solicitud no fue aprobada.${reason ? " Motivo: " + reason : ""}</p>`,
  });
}
