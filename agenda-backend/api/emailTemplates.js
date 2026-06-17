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
      background-color: #0f0c1b;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
      color: #e2e8f0;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0c1b;
      padding: 30px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: rgba(30, 27, 57, 0.95);
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
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 20px;
    }
    p {
      font-size: 16px;
      line-height: 1.6;
      color: #94a3b8;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .code-box {
      text-align: center;
      margin: 30px 0;
      padding: 20px;
      background: rgba(99, 102, 241, 0.15);
      border-radius: 12px;
      border: 1px dashed rgba(99, 102, 241, 0.4);
    }
    .code-text {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #818cf8;
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
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      border-radius: 10px;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .alert-box {
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #fca5a5;
    }
    .info-box {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(71, 85, 105, 0.3);
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
      color: #ffffff;
      width: 120px;
      flex-shrink: 0;
    }
    .info-value {
      color: #cbd5e1;
    }
    .footer {
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      background-color: #0d0a18;
    }
    .footer p {
      font-size: 12px;
      color: #64748b;
      margin: 0 0 6px 0;
    }
    .footer-credits {
      font-weight: 600;
      color: #94a3b8 !important;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="header-logo">✨ Agenda Web</div>
      </div>
      <div class="content">
`;

const baseFooter = `
      </div>
      <div class="footer">
        <p class="footer-credits">Agenda Web — Gerenciamento Inteligente de Compromissos</p>
        <p>Este é um e-mail enviado de forma automática pelo sistema. Por favor, não responda esta mensagem.</p>
        <p>© 2026 Agenda Web. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * 1. Template de Verificação de Conta
 */
exports.getVerificationTemplate = (nomeUsuario, codigo) => {
  return `
    ${baseHeader('Verifique seu e-mail')}
    <h1>Confirmar seu endereço de e-mail</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>Obrigado por criar sua conta na <strong>Agenda Web</strong>. Para ativar sua conta e liberar o acesso completo ao sistema, use o código de verificação de uso único abaixo:</p>
    
    <div class="code-box">
      <div class="code-text">${codigo}</div>
    </div>
    
    <p>Insira esse código na tela de verificação. O código expira em <strong>10 minutos</strong>.</p>
    <div class="alert-box">
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
    <h1>Recuperar sua Senha</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta na <strong>Agenda Web</strong>. Utilize o código de segurança abaixo para prosseguir com a recuperação:</p>
    
    <div class="code-box">
      <div class="code-text">${codigo}</div>
    </div>
    
    <p>Insira esse código na tela de redefinição. O código expira em <strong>10 minutos</strong>.</p>
    <div class="alert-box" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.2); color: #fde047;">
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
    <h1>Sua senha foi alterada</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>Este é um aviso de segurança para confirmar que a senha da sua conta na <strong>Agenda Web</strong> foi alterada com sucesso recentemente.</p>
    
    <p>Se você realizou essa alteração, nenhuma ação adicional é necessária. Sua conta está atualizada e segura.</p>
    
    <div class="alert-box">
      <strong>IMPORTANTE:</strong> Se você NÃO solicitou essa alteração de senha, entre em contato imediatamente com o suporte ou tente redefinir sua senha novamente usando a página de recuperação.
    </div>
    ${baseFooter}
  `;
};

/**
 * 4. Template de Alerta de Evento
 */
exports.getEventAlertTemplate = (nomeUsuario, titulo, data_hora, link, minutos, isUrgente) => {
  const urgencyTag = isUrgente ? '<span style="color: #ef4444; font-weight: bold;">[URGENTE]</span>' : '';
  return `
    ${baseHeader('Alerta de Compromisso')}
    <h1>Lembrete de Compromisso ${urgencyTag}</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>Este é um aviso de que seu compromisso se iniciará em breve (daqui a <strong>${minutos} minutos</strong>):</p>
    
    <div class="info-box">
      <div class="info-item">
        <div class="info-label">Título:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Data e Hora:</div>
        <div class="info-value">${data_hora}</div>
      </div>
    </div>
    
    <div class="button-box">
      <a href="${link}" class="btn">Visualizar Compromisso</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 5. Template de Evento Iniciado
 */
exports.getEventStartedTemplate = (nomeUsuario, titulo, data_hora, link, isUrgente) => {
  const urgencyTag = isUrgente ? '<span style="color: #ef4444; font-weight: bold;">[URGENTE]</span>' : '';
  return `
    ${baseHeader('Compromisso Iniciado')}
    <h1>Seu Compromisso Começou! ${urgencyTag}</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>O seu compromisso agendado começou neste exato momento:</p>
    
    <div class="info-box">
      <div class="info-item">
        <div class="info-label">Título:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Data e Hora:</div>
        <div class="info-value">${data_hora}</div>
      </div>
    </div>
    
    <div class="button-box">
      <a href="${link}" class="btn">Acessar Compromisso</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 6. Template de Notificação de Evento de Grupo Criado
 */
exports.getGroupEventCreatedTemplate = (nomeMembro, nomeGrupo, titulo, data_hora, local, criador, link) => {
  return `
    ${baseHeader('Novo Evento no Grupo')}
    <h1>Novo Compromisso de Grupo Criado</h1>
    <p>Olá, <strong>${nomeMembro}</strong>!</p>
    <p>Um novo compromisso compartilhado foi adicionado ao grupo <strong>${nomeGrupo}</strong> por <strong>${criador}</strong>:</p>
    
    <div class="info-box">
      <div class="info-item">
        <div class="info-label">Evento:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Data e Hora:</div>
        <div class="info-value">${data_hora}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Local:</div>
        <div class="info-value">${local || 'Não informado'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Grupo:</div>
        <div class="info-value" style="color: #818cf8; font-weight: 600;">${nomeGrupo}</div>
      </div>
    </div>
    
    <div class="button-box">
      <a href="${link}" class="btn">Acessar Calendário do Grupo</a>
    </div>
    ${baseFooter}
  `;
};

// 7. Template de Convite para Grupo
exports.getGroupInviteTemplate = (nomeUsuario, nomeGrupo, quemConvidou) => {
  return `
    ${baseHeader('Você foi adicionado a um Grupo')}
    <h1>Novo Grupo Compartilhado</h1>
    <p>Olá, <strong>${nomeUsuario}</strong>!</p>
    <p>Você foi adicionado ao grupo <strong>${nomeGrupo}</strong> por <strong>${quemConvidou}</strong>.</p>
    <p>A partir de agora, você pode acompanhar os compromissos compartilhados, agendar novas reuniões no calendário coletivo e colaborar com os outros membros do grupo.</p>
    
    <div class="button-box">
      <a href="http://localhost:8000/dashboard.html" class="btn">Entrar na Agenda Web</a>
    </div>
    ${baseFooter}
  `;
};

/**
 * 8. Template de Notificação de Evento de Grupo Atualizado
 */
exports.getGroupEventUpdatedTemplate = (nomeMembro, nomeGrupo, titulo, data_hora, local, alteradoPor, link) => {
  return `
    ${baseHeader('Evento de Grupo Atualizado')}
    <h1>Compromisso de Grupo Alterado</h1>
    <p>Olá, <strong>${nomeMembro}</strong>!</p>
    <p>O compromisso compartilhado do grupo <strong>${nomeGrupo}</strong> foi atualizado por <strong>${alteradoPor}</strong>. Confira as novas informações:</p>
    
    <div class="info-box">
      <div class="info-item">
        <div class="info-label">Evento:</div>
        <div class="info-value" style="font-weight: bold; color: #ffffff;">${titulo}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Data e Hora:</div>
        <div class="info-value">${data_hora}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Local:</div>
        <div class="info-value">${local || 'Não informado'}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Grupo:</div>
        <div class="info-value" style="color: #818cf8; font-weight: 600;">${nomeGrupo}</div>
      </div>
    </div>
    
    <div class="button-box">
      <a href="${link}" class="btn">Acessar Calendário do Grupo</a>
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
    <h1>Compromisso de Grupo Cancelado</h1>
    <p>Olá, <strong>${nomeMembro}</strong>!</p>
    <p>Atenção: o compromisso compartilhado <strong>"${titulo}"</strong> do grupo <strong>${nomeGrupo}</strong> foi cancelado/excluído por <strong>${excluidoPor}</strong>.</p>
    <div class="alert-box" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;">
      Este compromisso não consta mais no calendário do seu grupo.
    </div>
    ${baseFooter}
  `;
};

