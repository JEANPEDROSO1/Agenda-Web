const { getGraphClient } = require('./graphClient');
const {
  getVerificationTemplate,
  getRecoveryTemplate,
  getPasswordChangeAlertTemplate,
  getEventAlertTemplate,
  getEventStartedTemplate,
  getGroupEventCreatedTemplate,
  getGroupInviteTemplate,
  getGroupEventUpdatedTemplate,
  getGroupEventDeletedTemplate
} = require('./emailTemplates');

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
  const contentHTML = getEventStartedTemplate(nomeUsuario, titulo, data_hora, link, isUrgente);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Alert email (X minutos antes do evento)
const sendEventAlertEmail = async (toEmail, nomeUsuario, titulo, data_hora, link, minutos, isUrgente) => {
  const subject = isUrgente ? `URGENTE: ${titulo} em ${minutos} minutos` : `Lembrete: ${titulo} em ${minutos} minutos`;
  const contentHTML = getEventAlertTemplate(nomeUsuario, titulo, data_hora, link, minutos, isUrgente);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Verification email (code)
const sendVerificationEmail = async (toEmail, nomeUsuario, codigo) => {
  const subject = `Código de Verificação da Agenda Web`;
  const contentHTML = getVerificationTemplate(nomeUsuario, codigo);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Password Recovery email
const sendRecoveryEmail = async (toEmail, nomeUsuario, codigo) => {
  const subject = `Código de Segurança para Recuperação de Senha`;
  const contentHTML = getRecoveryTemplate(nomeUsuario, codigo);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Password change security alert
const sendPasswordChangeAlert = async (toEmail, nomeUsuario) => {
  const subject = `Aviso de Segurança: Senha Alterada`;
  const contentHTML = getPasswordChangeAlertTemplate(nomeUsuario);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Group event creation alert
const sendGroupEventCreatedEmail = async (toEmail, nomeMembro, nomeGrupo, titulo, data_hora, local, criador, link) => {
  const subject = `Novo compromisso no grupo: ${titulo}`;
  const contentHTML = getGroupEventCreatedTemplate(nomeMembro, nomeGrupo, titulo, data_hora, local, criador, link);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Group event update alert
const sendGroupEventUpdatedEmail = async (toEmail, nomeMembro, nomeGrupo, titulo, data_hora, local, alteradoPor, link) => {
  const subject = `Compromisso atualizado no grupo: ${titulo}`;
  const contentHTML = getGroupEventUpdatedTemplate(nomeMembro, nomeGrupo, titulo, data_hora, local, alteradoPor, link);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Group event deletion/cancellation alert
const sendGroupEventDeletedEmail = async (toEmail, nomeMembro, nomeGrupo, titulo, excluidoPor) => {
  const subject = `Compromisso cancelado no grupo: ${titulo}`;
  const contentHTML = getGroupEventDeletedTemplate(nomeMembro, nomeGrupo, titulo, excluidoPor);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

// Group invite alert
const sendGroupInviteEmail = async (toEmail, nomeMembro, nomeGrupo, quemConvidou) => {
  const subject = `Você foi adicionado ao grupo: ${nomeGrupo}`;
  const contentHTML = getGroupInviteTemplate(nomeMembro, nomeGrupo, quemConvidou);
  await sendGraphEmail(toEmail, subject, contentHTML);
};

module.exports = {
  sendEventEmail,
  sendEventAlertEmail,
  sendVerificationEmail,
  sendRecoveryEmail,
  sendPasswordChangeAlert,
  sendGroupEventCreatedEmail,
  sendGroupEventUpdatedEmail,
  sendGroupEventDeletedEmail,
  sendGroupInviteEmail
};
