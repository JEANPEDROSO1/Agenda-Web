// verify.js – handles email verification flow
// Assumes API_BASE is defined in config.js and showNotification() is globally available

document.addEventListener('DOMContentLoaded', () => {
  const email = sessionStorage.getItem('pendingVerificationEmail');
  if (!email) {
    // No email stored – redirect to registration or login
    showNotification('Nenhum cadastro pendente encontrado. Redirecione para o cadastro.', 'error');
    setTimeout(() => {
      window.location.href = 'cadastro.html';
    }, 2000);
    return;
  }

  const codigoInput = document.getElementById('codigo');
  if (codigoInput) {
    // Trata digitação normal
    codigoInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });

    // Trata colagem (paste) garantindo que letras sejam ignoradas
    codigoInput.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text');
      const numbersOnly = pastedData.replace(/[^0-9]/g, '');
      
      const start = codigoInput.selectionStart;
      const end = codigoInput.selectionEnd;
      const currentValue = codigoInput.value;
      
      const newValue = currentValue.substring(0, start) + numbersOnly + currentValue.substring(end);
      
      codigoInput.value = newValue;
      codigoInput.selectionStart = codigoInput.selectionEnd = start + numbersOnly.length;
    });
  }

  const verifyForm = document.getElementById('verifyForm');
  if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const codigo = document.getElementById('codigo')?.value?.trim();
      if (!codigo) {
        showNotification('Código de verificação é obrigatório.', 'error');
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, codigo })
        });
        const data = await response.json();
        if (!response.ok) {
          const msg = data.error || data.message || 'Falha na verificação.';
          throw new Error(msg);
        }
        // Success – store token and clean pending flag
        localStorage.setItem('token', data.token);
        try {
          const payload = JSON.parse(atob(data.token.split('.')[1]));
          localStorage.setItem('userId', payload.id);
        } catch (_) {}
        localStorage.removeItem('pendingVerificationEmail');
        showNotification('Conta verificada com sucesso! Redirecionando...', 'success');
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);
      } catch (err) {
        console.error('Erro na verificação:', err);
        showNotification('Erro: ' + err.message, 'error');
      }
    });
  }

  // Resend code link
  const resendLink = document.getElementById('resendLink');
  if (resendLink) {
    resendLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const resp = await fetch(`${API_BASE}/auth/resend-code`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const result = await resp.json();
        if (!resp.ok) {
          const msg = result.error || result.message || 'Falha ao reenviar código.';
          throw new Error(msg);
        }
        showNotification('Novo código enviado ao seu e‑mail.', 'success');
      } catch (e) {
        console.error('Erro ao reenviar código:', e);
        showNotification('Erro: ' + e.message, 'error');
      }
    });
  }

  // Alternar visualização do guia de passo a passo de ajuda
  const troubleshootToggle = document.getElementById('troubleshootToggle');
  const troubleshootContent = document.getElementById('troubleshootContent');
  if (troubleshootToggle && troubleshootContent) {
    troubleshootToggle.addEventListener('click', () => {
      const isHidden = troubleshootContent.classList.contains('hidden');
      if (isHidden) {
        troubleshootContent.classList.remove('hidden');
        troubleshootToggle.classList.add('active');
      } else {
        troubleshootContent.classList.add('hidden');
        troubleshootToggle.classList.remove('active');
      }
    });
  }
});
