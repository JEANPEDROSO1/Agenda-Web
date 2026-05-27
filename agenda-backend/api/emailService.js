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
        from: process.env.SENDER_EMAIL || process.env.EMAIL_USER,
        to: toEmail,
        subject: subject,
        text: plainText,
        html: contentHTML,
        headers: {
          'X-Priority': '1 (Highest)',
          'X-MSMail-Priority': 'High',
        },
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


module.exports = { sendEventEmail, sendEventAlertEmail };
