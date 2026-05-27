const { getGraphClient } = require('./graphClient');
require('dotenv').config();
if (!process.env.AZURE_CLIENT_ID) {
  const path = require('path');
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });
}

const sendGraphEmail = async (toEmail, subject, contentHTML) => {
    try {
        const client = await getGraphClient();
        const sendMail = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML',
                    content: contentHTML
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: toEmail
                        }
                    }
                ]
            },
            saveToSentItems: true
        };
        
        await client.api('/me/sendMail').post(sendMail);
        console.log(`[Graph API] Email enviado para ${toEmail} com sucesso!`);
        return;
    } catch (error) {
        // Se o Graph falhar (ex.: nenhuma conta autenticada), tenta SMTP via Nodemailer
        console.warn('[Email Service] Falha no Graph, tentando fallback SMTP:', error.message);
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: 'smtp-mail.outlook.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                connectionTimeout: 5000,
                greetingTimeout: 5000,
                socketTimeout: 5000
            });
            await transporter.sendMail({
                from: process.env.SENDER_EMAIL || process.env.EMAIL_USER,
                to: toEmail,
                subject: subject,
                html: contentHTML
            });
            console.log(`[SMTP] Email enviado para ${toEmail} via fallback.`);
        } catch (smtpErr) {
            console.error('[Email Service] Falha ao enviar e‑mail via SMTP fallback:', smtpErr);
        }
    }
};

const getProfessionalTemplate = (titleText, detailText, eventTitle, eventTime, link, accentColor, badgeHTML) => {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${titleText}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="500px" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 24px 30px; border-bottom: 1px solid #f1f5f9;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="font-size: 15px; font-weight: 700; color: #0f172a; font-family: inherit;">
                                        <span style="background-color: #eff6ff; color: #3b82f6; padding: 4px 8px; border-radius: 6px; font-size: 13px; margin-right: 6px;">📅</span>
                                        Agenda Web
                                    </td>
                                    <td align="right">
                                        ${badgeHTML}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 30px 30px 24px 30px;">
                            <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 800; color: #0f172a; font-family: inherit; letter-spacing: -0.5px; line-height: 1.3;">
                                ${eventTitle}
                            </h2>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569; font-family: inherit;">
                                ${detailText}
                            </p>
                            
                            <!-- Event Detail Box -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${accentColor}; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 16px 20px;">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            <tr>
                                                <td style="padding-bottom: 4px;">
                                                    <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">Horário Agendado</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="font-size: 14px; font-weight: 600; color: #1e293b; font-family: inherit;">
                                                    ${eventTime}
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Button Link -->
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center">
                                        <a href="${link}" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 13px; padding: 12px 28px; border-radius: 8px; font-family: inherit; box-shadow: 0 2px 4px rgba(15,23,42,0.1);">
                                            Visualizar na Agenda
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                            <p style="margin: 0; font-size: 11px; line-height: 1.5; color: #94a3b8; font-family: inherit;">
                                Notificação automática de compromissos da sua conta.<br>
                                Favor não responder a este e-mail.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

const sendEventEmail = async (toEmail, titulo, data_hora, link, isUrgente) => {
    let subject, titleText, detailText, accentColor, badgeHTML;

    if (isUrgente) {
        subject = `Compromisso: ${titulo}`;
        titleText = `Compromisso Agendado`;
        detailText = `Este é um lembrete automático de que um compromisso importante cadastrado em sua agenda iniciou.`;
        accentColor = `#1e3a8a`; // Azul Escuro de alta prioridade
        badgeHTML = `<span style="background-color: #fef2f2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: inherit;">Alta Prioridade</span>`;
    } else {
        subject = `Lembrete: ${titulo}`;
        titleText = `Compromisso Agendado`;
        detailText = `Este é um lembrete automático de que um compromisso cadastrado em sua agenda iniciou.`;
        accentColor = `#2563eb`; // Azul Padrão
        badgeHTML = `<span style="background-color: #eff6ff; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: inherit;">Compromisso</span>`;
    }

    const contentHTML = getProfessionalTemplate(titleText, detailText, titulo, data_hora, link, accentColor, badgeHTML);
    await sendGraphEmail(toEmail, subject, contentHTML);
};

const sendEventAlertEmail = async (toEmail, titulo, data_hora, link, minutos, isUrgente) => {
    let tempoTexto = `${minutos} minutos`;
    if (minutos === 60) {
        tempoTexto = `1 hora`;
    }
    
    let subject, titleText, detailText, accentColor, badgeHTML;

    if (isUrgente) {
        subject = `Lembrete: "${titulo}" em ${tempoTexto}`;
        titleText = `Compromisso Próximo`;
        detailText = `Este é um lembrete de que um compromisso importante iniciará em aproximadamente ${tempoTexto}.`;
        accentColor = `#1e3a8a`;
        badgeHTML = `<span style="background-color: #fef2f2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: inherit;">Urgente • ${tempoTexto}</span>`;
    } else {
        subject = `Lembrete: "${titulo}" em ${tempoTexto}`;
        titleText = `Compromisso Próximo`;
        detailText = `Este é um lembrete de que um compromisso agendado iniciará em aproximadamente ${tempoTexto}.`;
        accentColor = `#2563eb`;
        badgeHTML = `<span style="background-color: #eff6ff; color: #1e40af; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; text-transform: uppercase; font-family: inherit;">Aviso • ${tempoTexto}</span>`;
    }

    const contentHTML = getProfessionalTemplate(titleText, detailText, titulo, data_hora, link, accentColor, badgeHTML);
    await sendGraphEmail(toEmail, subject, contentHTML);
};

module.exports = { sendEventEmail, sendEventAlertEmail };
