const { getGraphClient } = require('./graphClient');
require('dotenv').config();
if (!process.env.AZURE_CLIENT_ID) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });
}

// Helper to send email via Microsoft Graph API with SMTP fallback
const sendGraphEmail = async (toEmail, subject, contentHTML) => {
  try {
    const client = await getGraphClient();
    const sendMail = {
      message: {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: contentHTML,
        },
        toRecipients: [{ emailAddress: { address: toEmail } }],
        from: { emailAddress: { address: process.env.SENDER_EMAIL || process.env.EMAIL_USER } },
        importance: 'high',
      },
      saveToSentItems: true,
    };
    await client.api('/me/sendMail').post(sendMail);
    console.log(`[Graph API] Email enviado para ${toEmail} com sucesso!`);
  } catch (error) {
    console.warn('[Email Service] Falha no Graph, tentando fallback SMTP:', error.message);
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      // Generate a simple plain‑text version by stripping HTML tags
      const plainText = contentHTML.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      await transporter.sendMail({
        from: `"Agenda Web" <${process.env.SENDER_EMAIL || process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: subject,
        text: plainText,
        html: contentHTML
      });
      console.log(`[SMTP] Email enviado para ${toEmail} via fallback.`);
    } catch (smtpErr) {
      console.error('[Email Service] Falha ao enviar e‑mail via SMTP fallback:', smtpErr);
    }
  }
};

// Immediate start email (evento já começou)
const sendEventEmail = async (toEmail, nomeUsuario, titulo, data_hora, link, isUrgente) => {
    const subject = isUrgente ? `URGENTE: ${titulo}` : `Lembrete: ${titulo}`;
    const eventText = isUrgente 
        ? `Seu compromisso "${titulo}" é URGENTE e começou agora.` 
        : `Seu compromisso "${titulo}" começou agora.`;

    const contentHTML = `
        <p>Olá ${nomeUsuario}!</p>
        <p>${eventText} Agendado para: ${data_hora}.</p>
        <p>Este é o link para acessar o site: ${link} ou clique em "Acessar o compromisso" abaixo.</p>
        <p><a href="${link}">Acessar o compromisso</a>.</p>
        <p>Por favor, não responda este e‑mail.</p>
    `;
    await sendGraphEmail(toEmail, subject, contentHTML);
};

const sendEventAlertEmail = async (toEmail, nomeUsuario, titulo, data_hora, link, minutos, isUrgente) => {
    const subject = isUrgente ? `URGENTE: ${titulo} em ${minutos} minutos` : `Lembrete: ${titulo} em ${minutos} minutos`;
    const alertText = isUrgente 
        ? `Este é um aviso de ${minutos} minutos adiantados do evento URGENTE. Seu evento "${titulo}" iniciará em breve.` 
        : `Este é um aviso de ${minutos} minutos adiantados. Seu evento "${titulo}" iniciará em breve.`;

    const contentHTML = `
        <p>Olá ${nomeUsuario}!</p>
        <p>${alertText} Agendado para: ${data_hora}.</p>
        <p>Este é o link para acessar o site: ${link} ou clique em "Acessar o compromisso" abaixo.</p>
        <p><a href="${link}">Acessar o compromisso</a>.</p>
        <p>Por favor, não responda este e‑mail.</p>
    `;
    await sendGraphEmail(toEmail, subject, contentHTML);
};


// Alert email (X minutos antes do evento)
// Verification email (code)
const sendVerificationEmail = async (toEmail, nomeUsuario, codigo) => {
  const subject = `Código de Verificação da Agenda Web`;
  const contentHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 40px; color: #1f2937;">
      <div style="text-align: center; margin-bottom: 30px;">
        <span style="font-size: 24px; font-weight: 800; color: #1d4ed8; font-family: sans-serif; letter-spacing: -0.5px;">Agenda Web</span>
      </div>
      
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-top: 0; margin-bottom: 16px; text-align: center;">Confirmar seu endereço de e-mail</h2>
      
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 20px;">
        Olá, <strong>${nomeUsuario}</strong>! Obrigado por criar sua conta na Agenda Web.
      </p>
      
      <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
        Para ativar sua conta e começar a gerenciar seus compromissos, por favor insira o código de verificação de uso único abaixo na página de ativação:
      </p>
      
      <div style="text-align: center; margin: 30px 0; padding: 22px; background-color: #f3f4f6; border-radius: 14px; border: 1px dashed #cbd5e1;">
        <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1e3a8a; font-family: monospace; padding-left: 8px;">${codigo}</span>
      </div>
      
      <p style="font-size: 13px; line-height: 1.5; color: #6b7280; margin-bottom: 24px; text-align: center; background-color: #fffbeb; border: 1px solid #fef3c7; padding: 12px; border-radius: 8px;">
        Este código é de uso único. Caso você não tenha solicitado este cadastro, ignore e exclua este e-mail com segurança.
      </p>
      
      <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
      
      <div style="text-align: center; font-size: 12px; color: #9ca3af; line-height: 1.5;">
        <p style="margin: 0 0 4px 0; font-weight: 600;">Agenda Web - Organização de Compromissos</p>
        <p style="margin: 0 0 12px 0;">Este é um e-mail automático gerado pelo sistema. Por favor, não responda a esta mensagem.</p>
        <p style="margin: 0;">© 2026 Agenda Web. Todos os direitos reservados.</p>
      </div>
    </div>
  `;
  await sendGraphEmail(toEmail, subject, contentHTML);
};

module.exports = { sendEventEmail, sendEventAlertEmail, sendVerificationEmail };
