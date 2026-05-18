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
    confirmLogout.addEventListener('click', () => {
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
document.addEventListener('DOMContentLoaded', initMenuHandler);
