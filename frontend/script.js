// API_BASE carregado do config.js

console.log('Script carregado, URL atual:', window.location.href);

// Função para fazer requisições com melhor tratamento de erro
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

// Função para fazer requisições com melhor tratamento de erro
async function apiRequest(url, options = {}) {
  try {
    console.log('Fazendo requisição para:', url);
    
    const token = localStorage.getItem('token');
    const headers = {
      'Authorization': token ? `Bearer ${token}` : '',
      ...options.headers
    };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const fetchOptions = {
      ...options,
      credentials: 'include', // Envia e recebe cookies HttpOnly
      headers: headers
    };

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      // Se for 401 (Não autorizado ou expirado), tenta fazer refresh
      if (response.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            console.log('Token expirado. Tentando renovar sessão...');
            const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' }
            });

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              localStorage.setItem('token', refreshData.token);
              console.log('Sessão renovada com sucesso!');
              isRefreshing = false;
              onRefreshed(refreshData.token);
            } else {
              throw new Error('Falha ao renovar token');
            }
          } catch (refreshErr) {
            console.error('Sessão expirada de fato:', refreshErr);
            isRefreshing = false;
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            window.location.href = 'login.html';
            throw new Error('Sessão expirada. Faça login novamente.');
          }
        }

        // Aguarda a renovação do token para refazer a requisição
        const retryRequest = new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            fetchOptions.headers['Authorization'] = `Bearer ${newToken}`;
            fetch(url, fetchOptions)
              .then(res => {
                if (!res.ok) throw new Error('Falha ao refazer requisição');
                return res.json();
              })
              .then(data => resolve(data))
              .catch(err => reject(err));
          });
        });

        return await retryRequest;
      }
      
      // Se for 403 e a mensagem de erro indicar conta não verificada
      if (response.status === 403) {
        const errorText = await response.text();
        if (errorText.toLowerCase().includes('não verificado') || errorText.toLowerCase().includes('confirmada')) {
          window.location.href = 'verify.html';
          return;
        }
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
  if (data.user && data.user.id) {
    localStorage.setItem('userId', data.user.id);
  } else {
    try {
      const payload = JSON.parse(atob(data.token.split('.')[1]));
      localStorage.setItem('userId', payload.id_usuario || payload.id);
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
    }
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
  // Capture inputs and format name (capitalize each word)
  let nomeRaw = document.getElementById('nome').value.trim();
  const nome = nomeRaw.split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  const email = document.getElementById('email').value.trim();
  const senha = document.getElementById('senha').value;
  const confirmarSenha = document.getElementById('confirmarSenha').value;
  if (senha !== confirmarSenha) {
    showNotification('As senhas informadas não são iguais. Verifique os campos de senha e tente novamente.', 'error');
    return;
  }

  // Desabilitar botão de submit correto durante o processamento
  const button = e.target.querySelector('.glass-submit-btn');
  if (!button) return;

  const originalContent = button.innerHTML;
  button.textContent = 'Criando conta...';
  button.disabled = true;

  let success = false;
  try {
    await apiRequest(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    });

    success = true;
    // Store email for verification step
    sessionStorage.setItem('pendingVerificationEmail', email);
    showNotification('Cadastro concluído. Verifique seu e‑mail para ativar a conta.', 'success');
    setTimeout(() => {
      window.location.href = 'verify.html';
    }, 1200);
  } catch (error) {
    console.error('Erro no cadastro:', error);
    showNotification('Erro no cadastro: ' + error.message, 'error');
  } finally {
    if (!success) {
      button.innerHTML = originalContent;
      button.disabled = false;
    }
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
      credentials: 'include',
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

      if (response.status === 403) {
        sessionStorage.setItem('pendingVerificationEmail', email);
        showNotification(errorMessage || 'E-mail ainda não confirmado. Redirecionando...', 'error');
        setTimeout(() => {
          window.location.href = 'verify.html';
        }, 2000);
        return;
      }
      
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

// Auto-login se o usuário acessar a página de login tendo uma sessão ativa
if (window.location.pathname.endsWith('login.html')) {
  (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        
        // Buscar dados do usuário para preencher localStorage.userId
        const userRes = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${data.token}` },
          credentials: 'include'
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          localStorage.setItem('userId', userData.user.id_usuario);
          window.location.href = 'dashboard.html';
        }
      }
    } catch (e) {
      console.log('Nenhuma sessão anterior ativa.');
    }
  })();
}
