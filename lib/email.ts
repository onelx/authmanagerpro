import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  throw new Error("RESEND_API_KEY environment variable is required");
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

interface EmailServiceResult {
  success: boolean;
  error?: string;
  messageId?: string;
}

class EmailService {
  private defaultFrom: string;

  constructor() {
    this.defaultFrom =
      process.env.EMAIL_FROM || "noreply@authmangerpro.com";
  }

  async sendEmail(params: SendEmailParams): Promise<EmailServiceResult> {
    try {
      const { to, subject, html, from } = params;

      const response = await resend.emails.send({
        from: from || this.defaultFrom,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      });

      if (response.error) {
        console.error("Resend API error:", response.error);
        return {
          success: false,
          error: response.error.message || "Error al enviar email",
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (error) {
      console.error("Email service error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      };
    }
  }

  async sendVerificationEmail(
    email: string,
    fullName: string
  ): Promise<EmailServiceResult> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificación de Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AuthManagerPro</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">¡Hola ${fullName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Gracias por registrarte en AuthManagerPro. Tu email ha sido verificado exitosamente.
            </p>
            
            <div style="background: white; border-left: 4px solid #4F46E5; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #6b7280;">
                <strong>¿Qué sigue?</strong><br>
                Tu cuenta está pendiente de aprobación por un administrador. Te notificaremos por email cuando tu cuenta sea aprobada.
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              Este proceso generalmente toma entre 24-48 horas hábiles.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              AuthManagerPro - Sistema de Gestión de Autenticación<br>
              © ${new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "✓ Email verificado - Pendiente de aprobación",
      html,
    });
  }

  async sendAdminNotification(
    adminEmail: string,
    newUserEmail: string,
    newUserName: string,
    userId: string
  ): Promise<EmailServiceResult> {
    const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/users?highlight=${userId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuevo Usuario Pendiente</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #DC2626, #EA580C); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Nueva Solicitud</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Nuevo usuario pendiente de aprobación</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Nombre:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${newUserName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;"><strong>Email:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${newUserEmail}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>ID Usuario:</strong></td>
                  <td style="padding: 10px 0; font-family: monospace; font-size: 12px;">${userId}</td>
                </tr>
              </table>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" 
                 style="display: inline-block; background: #4F46E5; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Revisar Solicitud
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280; text-align: center;">
              O copia este enlace en tu navegador:<br>
              <a href="${approvalUrl}" style="color: #4F46E5; word-break: break-all;">${approvalUrl}</a>
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              AuthManagerPro - Panel de Administración<br>
              © ${new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject: `🔔 Nuevo usuario pendiente: ${newUserName}`,
      html,
    });
  }

  async sendApprovalEmail(
    email: string,
    fullName: string
  ): Promise<EmailServiceResult> {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cuenta Aprobada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #10B981, #059669); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✓ Cuenta Aprobada</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">¡Bienvenido ${fullName}!</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Nos complace informarte que tu cuenta ha sido <strong style="color: #10B981;">aprobada</strong> exitosamente.
            </p>
            
            <div style="background: #D1FAE5; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 0; color: #065F46;">
                <strong>Ya puedes acceder a AuthManagerPro</strong><br>
                Utiliza tus credenciales de registro para iniciar sesión.
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${loginUrl}" 
                 style="display: inline-block; background: #10B981; color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Iniciar Sesión
              </a>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              AuthManagerPro - Sistema de Gestión de Autenticación<br>
              © ${new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "✓ Tu cuenta ha sido aprobada - AuthManagerPro",
      html,
    });
  }

  async sendRejectionEmail(
    email: string,
    fullName: string,
    reason?: string
  ): Promise<EmailServiceResult> {
    const reasonText = reason
      ? `<div style="background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
           <p style="margin: 0; color: #991B1B;">
             <strong>Motivo del rechazo:</strong><br>
             ${reason}
           </p>
         </div>`
      : "";

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Solicitud Rechazada</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #DC2626, #B91C1C); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">AuthManagerPro</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Hola ${fullName},</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Lamentamos informarte que tu solicitud de registro no ha sido aprobada en este momento.
            </p>
            
            ${reasonText}
            
            <p style="font-size: 14px; color: #6b7280;">
              Si crees que esto es un error o deseas más información, por favor contacta con el administrador del sistema.
            </p>
            
            <p style="font-size: 14px; color: #6b7280;">
              Agradecemos tu interés en AuthManagerPro.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              AuthManagerPro - Sistema de Gestión de Autenticación<br>
              © ${new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: "Actualización sobre tu solicitud - AuthManagerPro",
      html,
    });
  }

  async sendTestEmail(to: string): Promise<EmailServiceResult> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(to right, #4F46E5, #7C3AED); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✓ Test Exitoso</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">Email de Prueba</h2>
            
            <p style="font-size: 16px; color: #4b5563;">
              Este es un email de prueba del sistema AuthManagerPro.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #6b7280;">
                <strong>Hora de envío:</strong> ${new Date().toLocaleString("es-ES")}<br>
                <strong>Estado:</strong> <span style="color: #10B981;">Funcionando correctamente</span>
              </p>
            </div>
            
            <p style="font-size: 14px; color: #6b7280;">
              Si recibiste este email, significa que el servicio de notificaciones está configurado correctamente.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            
            <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
              AuthManagerPro - Sistema de Gestión de Autenticación<br>
              © ${new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to,
      subject: "✓ Test Email - AuthManagerPro",
      html,
    });
  }
}

export const emailService = new EmailService();
