// Script para gerenciar menu hamburger e logout em todas as páginas

function initMenuHandler() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navbarMenu = document.getElementById('navbarMenu');
  const logoutLink = document.getElementById('logoutLink');

  // Alternar menu ao clicar no hamburger
  if (hamburgerBtn) {
    hamburgerBtn.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
      hamburgerBtn.classList.toggle('active');
    });
  }

  // Fechar menu ao clicar em um link
  if (navbarMenu) {
    navbarMenu.querySelectorAll('a').forEach(link => {
      if (link !== logoutLink) { // Não fechar para logout link
        link.addEventListener('click', () => {
          navbarMenu.classList.remove('active');
          hamburgerBtn.classList.remove('active');
        });
      }
    });
  }

  // Fechar menu ao clicar fora
  document.addEventListener('click', (e) => {
    if (navbarMenu && hamburgerBtn && !navbarMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      navbarMenu.classList.remove('active');
      hamburgerBtn.classList.remove('active');
    }
  });

  // Logout
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      const logoutModal = document.getElementById('logoutModal');
      if (logoutModal) {
        logoutModal.style.display = 'flex';
        // Fechar menu após clicar em logout
        navbarMenu.classList.remove('active');
        hamburgerBtn.classList.remove('active');
      }
    });
  }

  // Confirmar logout
  const confirmLogout = document.getElementById('confirmLogout');
  if (confirmLogout) {
    confirmLogout.addEventListener('click', async () => {
      try {
        await apiRequest(`${API_BASE}/auth/logout`, { method: 'POST' });
      } catch (err) {
        console.error('Erro no logout do servidor:', err);
      }
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      window.location.href = 'login.html';
    });
  }

  // Cancelar logout
  const cancelLogout = document.getElementById('cancelLogout');
  if (cancelLogout) {
    cancelLogout.addEventListener('click', () => {
      const logoutModal = document.getElementById('logoutModal');
      if (logoutModal) {
        logoutModal.style.display = 'none';
      }
    });
  }

  // Fechar modal clicando fora
  const logoutModal = document.getElementById('logoutModal');
  if (logoutModal) {
    logoutModal.addEventListener('click', (e) => {
      if (e.target === logoutModal) {
        logoutModal.style.display = 'none';
      }
    });
  }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initMenuHandler();
  
    // Carregar foto de perfil e verificar permissão real no banco
    apiRequest(`${API_BASE}/profile`)
      .then(data => {
        const profile = data.profile;
        const navImg = document.getElementById('navUserAvatarImg');
        const navPlaceholder = document.getElementById('navUserAvatarPlaceholder');
        
        // Renderizar avatar se existir
        if (navImg && navPlaceholder && profile.foto_caminho) {
          navImg.src = profile.foto_caminho.startsWith('data:') || profile.foto_caminho.startsWith('http')
            ? profile.foto_caminho
            : `${API_BASE}${profile.foto_caminho}`;
          navImg.style.display = 'block';
          navPlaceholder.style.display = 'none';
        }

        // Definir de forma definitiva a visibilidade da aba Admin
        const adminLink = document.getElementById('adminNavLink');
        if (adminLink) {
          if (profile.role === 'admin') {
            adminLink.style.display = 'inline-block';
          } else {
            adminLink.style.display = 'none';
          }
        }
      })
      .catch(err => {
        console.warn('Erro ao buscar foto de perfil para o menu:', err);
      });

  // Ouvir evento customizado de atualização do avatar
  window.addEventListener('avatarUpdated', (e) => {
    const navImg = document.getElementById('navUserAvatarImg');
    const navPlaceholder = document.getElementById('navUserAvatarPlaceholder');
    if (navImg && navPlaceholder) {
      const imgSrc = e.detail.startsWith('data:') || e.detail.startsWith('http')
        ? e.detail
        : `${API_BASE}${e.detail}?t=${Date.now()}`;
      navImg.src = imgSrc;
      navImg.style.display = 'block';
      navPlaceholder.style.display = 'none';
    }
  });
});
