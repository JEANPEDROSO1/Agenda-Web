/**
 * Templates de E-mail Responsivos e Profissionais para a Agenda Web
 */

const baseHeader = (title) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      background-color: #0f0c1b !important;
      color: #e2e8f0 !important;
    }
    table {
      border-collapse: collapse;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0c1b !important;
      padding: 30px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1e1b39 !important;
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      padding: 35px 20px;
      text-align: center;
    }
    .header-logo {
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: -0.5px;
      margin: 0;
      display: inline-block;
    }
    .content {
      padding: 40px 30px;
      color: #e2e8f0;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff !important;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #94a3b8 !important;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .code-box {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background-color: #2a2745 !important;
      border-radius: 12px;
      border: 1px dashed #6366f1;
    }
    .code-text {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #818cf8 !important;
      font-family: 'Courier New', Courier, monospace;
      padding-left: 8px;
    }
    .button-box {
      text-align: center;
      margin: 30px 0 10px 0;
    }
    .btn {
      display: inline-block;
      padding: 14px 30px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      background-color: #4f46e5;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .alert-box {
      background-color: #3b1c20 !important;
      border: 1px solid #7f1d1d;
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #fca5a5 !important;
    }
    .info-box {
      background-color: #1a202c !important;
      border: 1px solid #2d3748;
      border-radius: 10px;
      padding: 20px;
      margin: 25px 0;
    }
    .info-item {
      display: flex;
      margin-bottom: 10px;
      font-size: 15px;
    }
    .info-item:last-child {
      margin-bottom: 0;
    }
    .info-label {
      font-weight: 700;
      color: #ffffff !important;
      width: 120px;
      flex-shrink: 0;
    }
    .info-value {
      color: #cbd5e1 !important;
    }
    .footer {
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #2d3748;
      background-color: #0d0a18 !important;
    }
    .footer p {
      font-size: 12px;
      color: #64748b !important;
      margin: 0 0 6px 0;
    }
    .footer-credits {
      font-weight: 600;
      color: #94a3b8 !important;
    }
  </style>
</head>
<body style="background-color: #0f0c1b; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0f0c1b" style="background-color: #0f0c1b;">
    <tr>
      <td align="center" style="padding: 30px 10px;">
        <table class="container" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #1e1b39; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          <tr>
            <td class="header" style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); background-color: #4f46e5; padding: 35px 20px; text-align: center;">
              <div class="header-logo" style="font-size: 26px; font-weight: 800; color: #ffffff;">✨ Agenda Web</div>
            </td>
          </tr>
          <tr>
            <td class="content" style="padding: 40px 30px; color: #e2e8f0; background-color: #1e1b39;">
`;

const baseFooter = `
            </td>
          </tr>
          <tr>
            <td class="footer" style="padding: 30px 20px; text-align: center; border-top: 1px solid #2d3748; background-color: #0d0a18;">
              <p class="footer-credits" style="color: #94a3b8; font-weight: 600; font-size: 12px; margin: 0 0 6px 0;">Agenda Web — Gerenciamento Inteligente de Compromissos</p>
              <p style="color: #64748b; font-size: 12px; margin: 0 0 6px 0;">Este é um e-mail enviado de forma automática pelo sistema. Por favor, não responda esta mensagem.</p>
              <p style="color: #64748b; font-size: 12px; margin: 0;">© 2026 Agenda Web. Todos os direitos reservados.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * 1. Template de Verificação de Conta
 */
exports.getVerificationTemplate = (nomeUsuario, codigo) => {
  return `
    ${baseHeader('Verifique seu e-mail')}
    <h1 style="color: #ffffff;">Confirmar seu endereço de e-mail</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">Obrigado por criar sua conta na <strong style="color: #ffffff;">Agenda Web</strong>. Para ativar sua conta e liberar o acesso completo ao sistema, use o código de verificação de uso único abaixo:</p>
    
    <div class="code-box" style="text-align: center; margin: 30px 0; padding: 20px; background-color: #2a2745; border-radius: 12px; border: 1px dashed #6366f1;">
      <div class="code-text" style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', Courier, monospace; padding-left: 8px;">${codigo}</div>
    </div>
    
    <p style="color: #94a3b8;">Insira esse código na tela de verificação. O código expira em <strong style="color: #ffffff;">10 minutos</strong>.</p>
    <div class="alert-box" style="background-color: #3b1c20; border: 1px solid #7f1d1d; border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 14px; color: #fca5a5;">
      Se você não realizou esse cadastro, pode ignorar este e-mail com segurança.
    </div>
    ${baseFooter}
  `;
};

/**
 * 2. Template de Código de Recuperação de Senha
 */
exports.getRecoveryTemplate = (nomeUsuario, codigo) => {
  return `
    ${baseHeader('Recuperação de Senha')}
    <h1 style="color: #ffffff;">Recuperar sua Senha</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">Recebemos uma solicitação para redefinir a senha da sua conta na <strong style="color: #ffffff;">Agenda Web</strong>. Utilize o código de segurança abaixo para prosseguir com a recuperação:</p>
    
    <div class="code-box" style="text-align: center; margin: 30px 0; padding: 20px; background-color: #2a2745; border-radius: 12px; border: 1px dashed #6366f1;">
      <div class="code-text" style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #818cf8; font-family: 'Courier New', Courier, monospace; padding-left: 8px;">${codigo}</div>
    </div>
    
    <p style="color: #94a3b8;">Insira esse código na tela de redefinição. O código expira em <strong style="color: #ffffff;">10 minutos</strong>.</p>
    <div class="alert-box" style="background-color: #422006; border: 1px solid #713f12; border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 14px; color: #fde047;">
      Caso você não tenha solicitado a redefinição de senha, por favor ignore este e-mail. A sua senha atual permanecerá segura.
    </div>
    ${baseFooter}
  `;
};

/**
 * 3. Template de Confirmação de Alteração de Senha (Segurança)
 */
exports.getPasswordChangeAlertTemplate = (nomeUsuario) => {
  return `
    ${baseHeader('Alteração de Senha Concluída')}
    <h1 style="color: #ffffff;">Sua senha foi alterada</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">Este é um aviso de segurança para confirmar que a senha da sua conta na <strong style="color: #ffffff;">Agenda Web</strong> foi alterada com sucesso recentemente.</p>
    
    <p style="color: #94a3b8;">Se você realizou essa alteração, nenhuma ação adicional é necessária. Sua conta está atualizada e segura.</p>
    
    <div class="alert-box" style="background-color: #3b1c20; border: 1px solid #7f1d1d; border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 14px; color: #fca5a5;">
      <strong style="color: #ffffff;">IMPORTANTE:</strong> Se você NÃO solicitou essa alteração de senha, entre em contato imediatamente com o suporte ou tente redefinir sua senha novamente usando a página de recuperação.
    </div>
    ${baseFooter}
  `;
};

/**
 * 4. Template de Alerta de Evento
 */
exports.getEventAlertTemplate = (nomeUsuario, titulo, data_hora, link, minutos, isUrgente) => {
  const urgencyTag = isUrgente ? '<span style="color: #ef4444; font-weight: bold;">[URGENTE]</span>' : '';
  const finalLink = link || 'https://agendaweb360.vercel.app/compromissos.html';
  return `
    ${baseHeader('Alerta de Compromisso')}
    <h1 style="color: #ffffff;">Lembrete de Compromisso ${urgencyTag}</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">Este é um aviso de que seu compromisso se iniciará em breve (daqui a <strong style="color: #ffffff;">${minutos} minutos</strong>):</p>
    
    <div class="info-box" style="background-color: #1a202c; border: 1px solid #2d3748; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Título:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item" style="display: flex; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Data e Hora:</div>
        <div class="info-value" style="color: #cbd5e1;">${data_hora}</div>
      </div>
    </div>
    
    <div class="button-box" style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${finalLink}" class="btn" style="display: inline-block; padding: 14px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">Visualizar Compromisso</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 5. Template de Evento Iniciado
 */
exports.getEventStartedTemplate = (nomeUsuario, titulo, data_hora, link, isUrgente) => {
  const urgencyTag = isUrgente ? '<span style="color: #ef4444; font-weight: bold;">[URGENTE]</span>' : '';
  const finalLink = link || 'https://agendaweb360.vercel.app/compromissos.html';
  return `
    ${baseHeader('Compromisso Iniciado')}
    <h1 style="color: #ffffff;">Seu Compromisso Começou! ${urgencyTag}</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">O seu compromisso agendado começou neste exato momento:</p>
    
    <div class="info-box" style="background-color: #1a202c; border: 1px solid #2d3748; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Título:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item" style="display: flex; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Data e Hora:</div>
        <div class="info-value" style="color: #cbd5e1;">${data_hora}</div>
      </div>
    </div>
    
    <div class="button-box" style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${finalLink}" class="btn" style="display: inline-block; padding: 14px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">Acessar Compromisso</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 6. Template de Notificação de Evento de Grupo Criado
 */
exports.getGroupEventCreatedTemplate = (nomeMembro, nomeGrupo, titulo, data_hora, local, criador, link) => {
  const finalLink = link || 'https://agendaweb360.vercel.app/grupos.html';
  return `
    ${baseHeader('Novo Evento no Grupo')}
    <h1 style="color: #ffffff;">Novo Compromisso de Grupo Criado</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeMembro}</strong>!</p>
    <p style="color: #94a3b8;">Um novo compromisso compartilhado foi adicionado ao grupo <strong style="color: #ffffff;">${nomeGrupo}</strong> por <strong style="color: #ffffff;">${criador}</strong>:</p>
    
    <div class="info-box" style="background-color: #1a202c; border: 1px solid #2d3748; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Evento:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Data e Hora:</div>
        <div class="info-value" style="color: #cbd5e1;">${data_hora}</div>
      </div>
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Local:</div>
        <div class="info-value" style="color: #cbd5e1;">${local || 'Não informado'}</div>
      </div>
      <div class="info-item" style="display: flex; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Grupo:</div>
        <div class="info-value" style="color: #818cf8; font-weight: 600;">${nomeGrupo}</div>
      </div>
    </div>
    
    <div class="button-box" style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${finalLink}" class="btn" style="display: inline-block; padding: 14px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">Acessar Calendário do Grupo</a>
    </div>
    ${baseFooter}
  `;
};

// 7. Template de Convite para Grupo
exports.getGroupInviteTemplate = (nomeUsuario, nomeGrupo, quemConvidou) => {
  return `
    ${baseHeader('Você foi adicionado a um Grupo')}
    <h1 style="color: #ffffff;">Novo Grupo Compartilhado</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeUsuario}</strong>!</p>
    <p style="color: #94a3b8;">Você foi adicionado ao grupo <strong style="color: #ffffff;">${nomeGrupo}</strong> por <strong style="color: #ffffff;">${quemConvidou}</strong>.</p>
    <p style="color: #94a3b8;">A partir de agora, você pode acompanhar os compromissos compartilhados, agendar novas reuniões no calendário coletivo e colaborar com os outros membros do grupo.</p>
    
    <div class="button-box" style="text-align: center; margin: 30px 0 10px 0;">
      <a href="https://agendaweb360.vercel.app/grupos.html" class="btn" style="display: inline-block; padding: 14px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">Entrar na Agenda Web</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 8. Template de Notificação de Evento de Grupo Atualizado
 */
exports.getGroupEventUpdatedTemplate = (nomeMembro, nomeGrupo, titulo, data_hora, local, alteradoPor, link) => {
  const finalLink = link || 'https://agendaweb360.vercel.app/grupos.html';
  return `
    ${baseHeader('Evento de Grupo Atualizado')}
    <h1 style="color: #ffffff;">Compromisso de Grupo Alterado</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeMembro}</strong>!</p>
    <p style="color: #94a3b8;">O compromisso compartilhado do grupo <strong style="color: #ffffff;">${nomeGrupo}</strong> foi atualizado por <strong style="color: #ffffff;">${alteradoPor}</strong>. Confira as novas informações:</p>
    
    <div class="info-box" style="background-color: #1a202c; border: 1px solid #2d3748; border-radius: 10px; padding: 20px; margin: 25px 0;">
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Evento:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Data e Hora:</div>
        <div class="info-value" style="color: #cbd5e1;">${data_hora}</div>
      </div>
      <div class="info-item" style="display: flex; margin-bottom: 10px; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Local:</div>
        <div class="info-value" style="color: #cbd5e1;">${local || 'Não informado'}</div>
      </div>
      <div class="info-item" style="display: flex; font-size: 15px;">
        <div class="info-label" style="font-weight: 700; color: #ffffff; width: 120px; flex-shrink: 0;">Grupo:</div>
        <div class="info-value" style="color: #818cf8; font-weight: 600;">${nomeGrupo}</div>
      </div>
    </div>
    
    <div class="button-box" style="text-align: center; margin: 30px 0 10px 0;">
      <a href="${finalLink}" class="btn" style="display: inline-block; padding: 14px 30px; background-color: #4f46e5; color: #ffffff; text-decoration: none; font-weight: 600; border-radius: 10px;">Acessar Calendário do Grupo</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 9. Template de Notificação de Evento de Grupo Excluído/Cancelado
 */
exports.getGroupEventDeletedTemplate = (nomeMembro, nomeGrupo, titulo, excluidoPor) => {
  return `
    ${baseHeader('Evento de Grupo Cancelado')}
    <h1 style="color: #ffffff;">Compromisso de Grupo Cancelado</h1>
    <p style="color: #94a3b8;">Olá, <strong style="color: #ffffff;">${nomeMembro}</strong>!</p>
    <p style="color: #94a3b8;">Atenção: o compromisso compartilhado <strong style="color: #ffffff;">"${titulo}"</strong> do grupo <strong style="color: #ffffff;">${nomeGrupo}</strong> foi cancelado/excluído por <strong style="color: #ffffff;">${excluidoPor}</strong>.</p>
    <div class="alert-box" style="background-color: #3b1c20; border: 1px solid #7f1d1d; border-radius: 10px; padding: 15px; margin: 20px 0; font-size: 14px; color: #fca5a5;">
      Este compromisso não consta mais no calendário do seu grupo.
    </div>
    ${baseFooter}
  `;
};
