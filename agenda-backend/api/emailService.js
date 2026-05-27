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
      await transporter.sendMail({
        from: process.env.SENDER_EMAIL || process.env.EMAIL_USER,
        to: toEmail,
        subject: subject,
        html: contentHTML,
      });
      console.log(`[SMTP] Email enviado para ${toEmail} via fallback.`);
    } catch (smtpErr) {
      console.error('[Email Service] Falha ao enviar e‑mail via SMTP fallback:', smtpErr);
    }
  }
};

// Immediate start email (evento já começou)
const sendEventEmail = async (toEmail, titulo, data_hora, link, isUrgente) => {
  const userName = toEmail.split('@')[0];
  const subject = `Lembrete: ${titulo}`;
  const contentHTML = `
    <p>Ola ${userName}.</p>
    <p>seu evento ${titulo} começou agora, o horario definido foi ${data_hora}</p>
    <p>este é o <a href="${link}">link de acesso ao site</a></p>
    <p>Por favor não responda esse email.</p>
  `;
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Alert email (X minutos antes do evento)
const sendEventAlertEmail = async (toEmail, titulo, data_hora, link, minutos, isUrgente) => {
  const userName = toEmail.split('@')[0];
  const subject = `Lembrete: ${titulo} em ${minutos} minutos`;
  const contentHTML = `
    <p>Ola ${userName}.</p>
    <p>Esse é um aviso de ${minutos} minutos adiantados, seu evento ${titulo} começara em breve. Horario definido ${data_hora}</p>
    <p>este é o <a href="${link}">link para acessar o site</a></p>
    <p>Por favor não responda esse email.</p>
  `;
  await sendGraphEmail(toEmail, subject, contentHTML);
};

module.exports = { sendEventEmail, sendEventAlertEmail };
