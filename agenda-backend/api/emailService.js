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
            saveToSentItems: false
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
                }
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
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="width: 100%; background-color: #f3f4f6; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
            <!-- Header -->
            <div style="background-color: ${accentColor}; padding: 40px 30px; text-align: center;">
                <div style="background-color: rgba(255,255,255,0.2); width: 70px; height: 70px; border-radius: 50%; display: inline-block; line-height: 70px; font-size: 35px; margin-bottom: 20px;">
                    📅
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">${titleText}</h1>
            </div>
            
            <!-- Body -->
            <div style="padding: 40px 30px;">
                <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-top: 0; margin-bottom: 30px; text-align: center;">
                    ${detailText}
                </p>
                
                <div style="background-color: #f9fafb; border-radius: 12px; padding: 25px; border-left: 5px solid ${accentColor}; margin-bottom: 35px;">
                    <div style="margin-bottom: 15px; text-align: right;">
                        ${badgeHTML}
                    </div>
                    
                    <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Compromisso</span>
                    <h2 style="color: #111827; font-size: 22px; font-weight: 700; margin: 0 0 20px 0;">${eventTitle}</h2>
                    
                    <span style="font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 5px;">Horário Agendado</span>
                    <div style="color: #374151; font-size: 16px; font-weight: 500;">
                        ${eventTime}
                    </div>
                </div>
                
                <div style="text-align: center;">
                    <a href="${link}" style="display: inline-block; background-color: ${accentColor}; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; padding: 16px 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        Visualizar na Agenda
                    </a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 13px; line-height: 1.5; margin: 0;">
                    Este é um e-mail transacional gerado automaticamente pelo seu sistema de agendamento.<br>
                    Por favor, não responda a esta mensagem.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

const sendEventEmail = async (toEmail, titulo, data_hora, link, isUrgente) => {
    let subject, titleText, detailText, accentColor, badgeHTML;

    if (isUrgente) {
        subject = `Aviso Importante: O compromisso "${titulo}" iniciou`;
        titleText = `Compromisso Importante Iniciando`;
        detailText = `Atenção: Este compromisso foi classificado como urgente e está agendado para começar agora.`;
        accentColor = `#dc2626`; // Vermelho Carmesim Corporativo
        badgeHTML = `<span style="background-color: #dc262610; color: #dc2626; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">⚠️ Importante</span>`;
    } else {
        subject = `Lembrete: O compromisso "${titulo}" iniciou`;
        titleText = `Seu compromisso está iniciando`;
        detailText = `Este é o aviso de que o seu compromisso agendado começou neste exato momento.`;
        accentColor = `#2563eb`; // Azul Royal Corporativo
        badgeHTML = `<span style="background-color: #2563eb10; color: #2563eb; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">📌 Normal</span>`;
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
        subject = `Aviso Importante: "${titulo}" começa em ${tempoTexto}`;
        titleText = `Alerta Importante: Compromisso Próximo`;
        detailText = `Atenção: Um compromisso urgente começará em aproximadamente ${tempoTexto}. Por favor, programe-se.`;
        accentColor = `#ea580c`; // Laranja Intenso Corporativo
        badgeHTML = `<span style="background-color: #ea580c10; color: #ea580c; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">⚠️ Alerta Urgente - ${tempoTexto}</span>`;
    } else {
        subject = `Aviso Antecipado: "${titulo}" em ${tempoTexto}`;
        titleText = `Lembrete de Compromisso Próximo`;
        detailText = `Este é um aviso automático para você se preparar. Seu compromisso começará em aproximadamente ${tempoTexto}.`;
        accentColor = `#d97706`; // Dourado/Âmbar Corporativo
        badgeHTML = `<span style="background-color: #d9770610; color: #d97706; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; font-family: inherit;">🔔 Alerta - ${tempoTexto}</span>`;
    }

    const contentHTML = getProfessionalTemplate(titleText, detailText, titulo, data_hora, link, accentColor, badgeHTML);
    await sendGraphEmail(toEmail, subject, contentHTML);
};

module.exports = { sendEventEmail, sendEventAlertEmail };
