/**
 * Lógica do Fluxo de Recuperação de Senha - Agenda Web
 */

document.addEventListener('DOMContentLoaded', () => {
  let emailUsuario = '';
  let codigoRecuperacao = '';

  if (typeof initPasswordToggles === 'function') {
    initPasswordToggles();
  }

  const step1 = document.getElementById('step1');
  const step2 = document.getElementById('step2');
  const step3 = document.getElementById('step3');

  const dot1 = document.getElementById('dot1');
  const dot2 = document.getElementById('dot2');
  const dot3 = document.getElementById('dot3');

  const recoveryTitle = document.getElementById('recoveryTitle');
  const recoverySubtitle = document.getElementById('recoverySubtitle');

  // Configuração automática para focar os dígitos do código (Passo 2)
  const digits = document.querySelectorAll('.code-digit');
  digits.forEach((digit, index) => {
    digit.addEventListener('input', (e) => {
      // Permitir apenas números
      digit.value = digit.value.replace(/[^0-9]/g, '');

      if (digit.value.length === 1 && index < digits.length - 1) {
        digits[index + 1].focus();
      }
    });

    digit.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && digit.value.length === 0 && index > 0) {
        digits[index - 1].focus();
      }
    });

    digit.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text');
      // Filtra para pegar apenas os números e limita ao tamanho máximo (6 dígitos)
      const pastedNumbers = pastedData.replace(/[^0-9]/g, '').slice(0, digits.length);
      
      if (pastedNumbers) {
        // Preenche os inputs a partir do input atual onde o paste ocorreu
        for (let i = 0; i < pastedNumbers.length; i++) {
          if (index + i < digits.length) {
            digits[index + i].value = pastedNumbers[i];
          }
        }
        
        // Move o foco para o próximo campo vazio após os colados, ou para o último campo
        const nextIndex = Math.min(index + pastedNumbers.length, digits.length - 1);
        digits[nextIndex].focus();
      }
    });
  });

  // PASSO 1: Solicitar código de recuperação
  document.getElementById('forgotForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('email').value.trim();
    if (!emailInput) return;

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Enviando código...';
    btn.disabled = true;

    try {
      const data = await apiRequest(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        body: JSON.stringify({ email: emailInput })
      });

      emailUsuario = emailInput;
      showNotification(data.message || 'Código enviado!', 'success');

      // Avançar para o Passo 2
      step1.classList.add('hidden');
      step2.classList.remove('hidden');

      dot1.classList.remove('active');
      dot1.classList.add('completed');
      dot2.classList.add('active');

      recoveryTitle.textContent = 'Verificar Código';
      recoverySubtitle.textContent = 'Digite o código enviado ao seu e-mail';

      // Focar o primeiro dígito
      setTimeout(() => digits[0].focus(), 100);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // PASSO 2: Validar o código de 6 dígitos
  document.getElementById('verifyCodeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obter o código completo
    const code = Array.from(digits).map(d => d.value).join('');
    if (code.length !== 6) {
      showNotification('Por favor, digite os 6 dígitos do código.', 'error');
      return;
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Validando...';
    btn.disabled = true;

    try {
      const data = await apiRequest(`${API_BASE}/auth/verify-recovery-code`, {
        method: 'POST',
        body: JSON.stringify({ email: emailUsuario, codigo: code })
      });

      codigoRecuperacao = code;
      showNotification(data.message || 'Código validado com sucesso!', 'success');

      // Avançar para o Passo 3
      step2.classList.add('hidden');
      step3.classList.remove('hidden');

      dot2.classList.remove('active');
      dot2.classList.add('completed');
      dot3.classList.add('active');

      recoveryTitle.textContent = 'Redefinir Senha';
      recoverySubtitle.textContent = 'Escolha sua nova senha de acesso';
    } catch (err) {
      showNotification(err.message, 'error');
      // Limpar campos de dígito em caso de erro
      digits.forEach(d => d.value = '');
      digits[0].focus();
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });

  // PASSO 3: Salvar nova senha
  document.getElementById('resetPasswordForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmarNovaSenha = document.getElementById('confirmarNovaSenha').value;

    if (novaSenha !== confirmarNovaSenha) {
      showNotification('As senhas não coincidem. Verifique os campos.', 'error');
      return;
    }

    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.textContent = 'Redefinindo senha...';
    btn.disabled = true;

    try {
      const data = await apiRequest(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        body: JSON.stringify({
          email: emailUsuario,
          codigo: codigoRecuperacao,
          novaSenha: novaSenha
        })
      });

      showNotification('Senha redefinida com sucesso! Redirecionando...', 'success');

      dot3.classList.remove('active');
      dot3.classList.add('completed');

      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1500);
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
