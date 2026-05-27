// API_BASE carregado do config.js

console.log('Script carregado, URL atual:', window.location.href);

// Função para fazer requisições com melhor tratamento de erro
async function apiRequest(url, options = {}) {
  try {
    console.log('Fazendo requisição para:', url);
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = 'login.html';
        throw new Error('Sessão expirada. Redirecionando para o login...');
      }
      
      const errorData = await response.text();
      console.error('Erro na resposta:', response.status, errorData);
      let message = response.statusText;
      try {
        const parsed = JSON.parse(errorData);
        message = parsed.error || parsed.message || errorData;
      } catch (e) {
        message = errorData || response.statusText;
      }
      throw new Error(`Erro ${response.status}: ${message}`);
    }

    const data = await response.json();
    console.log('Resposta recebida:', data);
    return data;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

function storeAuthData(data) {
  localStorage.setItem('token', data.token);
  try {
    const payload = JSON.parse(atob(data.token.split('.')[1]));
    localStorage.setItem('userId', payload.id);
  } catch (error) {
    console.error('Erro ao decodificar token:', error);
  }
}

function initPasswordToggles() {
  console.log('Iniciando toggles de senha...');
  const openIcon = `<svg class="icon-eye" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z" stroke="#475569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#475569" stroke-width="3"/>
    </svg>`;
  const closedIcon = `<svg class="icon-eye" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94C16.16 19.23 14.13 20 11.99 20C5.82 20 1 12 1 12C1 12 2.53 9.16 4.58 7.12" stroke="#475569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M10.59 10.59C10.21 11.16 10 11.82 10 12.5C10 14.43 11.57 16 13.5 16C14.18 16 14.84 15.79 15.41 15.41" stroke="#475569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M9.88 4.33C11.73 3.93 13.8 4 16 4C22.17 4 27 12 27 12C26.27 13.5 25.3 14.85 24.13 16.02" stroke="#475569" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M1 1L23 23" stroke="#475569" stroke-width="3" stroke-linecap="round"/>
    </svg>`;

  document.querySelectorAll('.password-toggle').forEach((btn) => {
    console.log('Configurando botão:', btn);
    btn.innerHTML = closedIcon;
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = openIcon;
        btn.setAttribute('aria-label', 'Ocultar senha');
      } else {
        input.type = 'password';
        btn.innerHTML = closedIcon;
        btn.setAttribute('aria-label', 'Mostrar senha');
      }
    });
  });
}

// Cadastro
document.getElementById('cadastroForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const nome = document.getElementById('nome').value;
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  // Desabilitar botão durante o processamento
  const button = e.target.querySelector('button');
  const originalText = button.textContent;
  button.textContent = 'Criando conta...';
  button.disabled = true;

  try {
    await apiRequest(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    });

    // Store email for verification step
    localStorage.setItem('pendingVerificationEmail', email);
    showNotification('Cadastro concluído. Verifique seu e‑mail para ativar a conta.', 'success');
    setTimeout(() => {
      window.location.href = 'verify.html';
    }, 1200);
  } catch (error) {
    console.error('Erro no cadastro:', error);
    showNotification('Erro no cadastro: ' + error.message, 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
});

// Login
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const senha = document.getElementById('senha').value;

  console.log('Tentando fazer login com:', { email, senha: '***' });

  const button = e.target.querySelector('button');
  const originalText = button.textContent;
  button.textContent = 'Entrando...';
  button.disabled = true;

  try {
    console.log('Fazendo requisição para:', `${API_BASE}/auth/login`);
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });

    console.log('Status da resposta:', response.status);
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta:', errorText);
      
      let errorMessage = errorText;
      try {
        const parsed = JSON.parse(errorText);
        errorMessage = parsed.error || parsed.message || errorText;
      } catch (e) {}
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Dados recebidos:', data);

    if (!data.token) {
      throw new Error('Token não recebido na resposta');
    }

    storeAuthData(data);

    showNotification('Login realizado com sucesso!', 'success');
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } catch (error) {
    console.error('Erro completo no login:', error);
    showNotification(error.message, 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
});

// Inicializar toggles de senha
initPasswordToggles();

// Notificações melhoradas
function showNotification(message, type = 'info') {
  // Remover notificações existentes
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  });

  // Criar nova notificação
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  // Remover após 4 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 4000);
}

