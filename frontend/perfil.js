/**
 * Lógica do Perfil do Usuário - Agenda Web
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se o usuário está logado
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Carregar dados de perfil
  await loadUserProfile();

  // Escutar envio do formulário de dados cadastrais
  document.getElementById('profileDetailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('profileNome').value.trim();
    if (!nome) return;

    const btn = document.getElementById('btnSaveDetails');
    const originalContent = btn.innerHTML;
    btn.textContent = 'Salvando...';
    btn.disabled = true;

    try {
      const data = await apiRequest(`${API_BASE}/profile/update`, {
        method: 'PUT',
        body: JSON.stringify({ nome })
      });

      showNotification(data.message || 'Nome atualizado com sucesso!', 'success');
      document.getElementById('userMetaName').textContent = data.nome;
      
      // Atualizar nome no token se possível (opcional)
      // Recarregar os dados do perfil para atualizar o avatar
      await loadUserProfile();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  });

  // Lógica de upload de avatar com recorte/ajuste interativo
  const avatarTrigger = document.getElementById('avatarTrigger');
  const avatarFileInput = document.getElementById('avatarFileInput');
  
  const cropModal = document.getElementById('cropPhotoModal');
  const cropCanvas = document.getElementById('cropCanvas');
  const cropCtx = cropCanvas.getContext('2d');
  const cropZoomRange = document.getElementById('cropZoomRange');
  const btnCenterCrop = document.getElementById('btnCenterCrop');
  const btnCancelCrop = document.getElementById('btnCancelCrop');
  const btnConfirmCrop = document.getElementById('btnConfirmCrop');
  const cropDragArea = document.getElementById('cropDragArea');

  let cropImg = new Image();
  let cropZoom = 1.0;
  let cropX = 0;
  let cropY = 0;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Set canvas size
  cropCanvas.width = 250;
  cropCanvas.height = 250;

  avatarTrigger.addEventListener('click', () => {
    avatarFileInput.click();
  });

  avatarFileInput.addEventListener('change', () => {
    const file = avatarFileInput.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Tipo de arquivo inválido. Escolha uma imagem (PNG, JPG, WEBP).', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('A foto deve ter no máximo 5MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      cropImg = new Image();
      cropImg.onload = () => {
        cropX = 0;
        cropY = 0;
        
        // Ajustar zoom inicial para preencher a tela de 250x250
        const minZoom = Math.max(250 / cropImg.width, 250 / cropImg.height);
        cropZoom = minZoom;
        
        cropZoomRange.min = minZoom.toFixed(2);
        cropZoomRange.max = (minZoom * 4).toFixed(2);
        cropZoomRange.value = minZoom.toFixed(2);

        drawCrop();
        cropModal.style.display = 'flex';
      };
      cropImg.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  function drawCrop() {
    cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    
    // Fundo preto
    cropCtx.fillStyle = '#000000';
    cropCtx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);
    
    const w = cropImg.width * cropZoom;
    const h = cropImg.height * cropZoom;
    
    const x = (cropCanvas.width - w) / 2 + cropX;
    const y = (cropCanvas.height - h) / 2 + cropY;
    
    cropCtx.drawImage(cropImg, x, y, w, h);
  }

  cropZoomRange.addEventListener('input', () => {
    cropZoom = parseFloat(cropZoomRange.value);
    drawCrop();
  });

  // Mouse drag
  cropDragArea.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStartX = e.clientX - cropX;
    dragStartY = e.clientY - cropY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    cropX = e.clientX - dragStartX;
    cropY = e.clientY - dragStartY;
    drawCrop();
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Touch drag
  cropDragArea.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX - cropX;
      dragStartY = e.touches[0].clientY - cropY;
    }
  });

  cropDragArea.addEventListener('touchmove', (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    cropX = e.touches[0].clientX - dragStartX;
    cropY = e.touches[0].clientY - dragStartY;
    drawCrop();
  });

  cropDragArea.addEventListener('touchend', () => {
    isDragging = false;
  });

  btnCenterCrop.addEventListener('click', () => {
    cropX = 0;
    cropY = 0;
    const minZoom = Math.max(250 / cropImg.width, 250 / cropImg.height);
    cropZoom = minZoom;
    cropZoomRange.value = minZoom.toFixed(2);
    drawCrop();
  });

  btnCancelCrop.addEventListener('click', () => {
    cropModal.style.display = 'none';
    avatarFileInput.value = '';
  });

  btnConfirmCrop.addEventListener('click', () => {
    btnConfirmCrop.disabled = true;
    btnConfirmCrop.textContent = 'Enviando...';

    cropCanvas.toBlob(async (blob) => {
      if (!blob) {
        showNotification('Erro ao gerar imagem recortada.', 'error');
        btnConfirmCrop.disabled = false;
        btnConfirmCrop.textContent = 'Confirmar e Salvar';
        return;
      }

      const formData = new FormData();
      formData.append('foto', blob, 'avatar.png');

      try {
        const data = await apiRequest(`${API_BASE}/profile/photo`, {
          method: 'POST',
          body: formData
        });

        showNotification(data.message || 'Foto de perfil atualizada com sucesso!', 'success');
        cropModal.style.display = 'none';
        avatarFileInput.value = '';

        // Atualizar avatar na tela
        const imgEl = document.getElementById('userAvatarImg');
        const placeholderEl = document.getElementById('userAvatarPlaceholder');

        imgEl.src = `${API_BASE}${data.foto_caminho}?t=${Date.now()}`;
        imgEl.classList.remove('hidden');
        placeholderEl.classList.add('hidden');

        // Atualizar também nos menus se houver
        const navImg = document.getElementById('navUserAvatarImg');
        if (navImg) {
          navImg.src = `${API_BASE}${data.foto_caminho}?t=${Date.now()}`;
          navImg.style.display = 'block';
          const navPlaceholder = document.getElementById('navUserAvatarPlaceholder');
          if (navPlaceholder) navPlaceholder.style.display = 'none';
        }

        window.dispatchEvent(new CustomEvent('avatarUpdated', { detail: data.foto_caminho }));
      } catch (err) {
        showNotification(err.message, 'error');
      } finally {
        btnConfirmCrop.disabled = false;
        btnConfirmCrop.textContent = 'Confirmar e Salvar';
      }
    }, 'image/png');
  });
});

// Carregar informações do perfil
async function loadUserProfile() {
  try {
    const data = await apiRequest(`${API_BASE}/profile`);
    const profile = data.profile;

    document.getElementById('profileNome').value = profile.nome;
    document.getElementById('profileEmail').value = profile.email;
    document.getElementById('userMetaName').textContent = profile.nome;
    
    // Configurar a Role do usuário traduzida
    const roleEl = document.getElementById('userMetaRole');
    if (profile.role === 'admin') {
      roleEl.textContent = 'Administrador';
      roleEl.style.background = 'rgba(239, 68, 68, 0.15)';
      roleEl.style.borderColor = 'rgba(239, 68, 68, 0.3)';
      roleEl.style.color = '#fca5a5';
    } else {
      roleEl.textContent = 'Membro';
    }

    // Tratar imagem de avatar
    const imgEl = document.getElementById('userAvatarImg');
    const placeholderEl = document.getElementById('userAvatarPlaceholder');

    if (profile.foto_caminho) {
      imgEl.src = `${API_BASE}${profile.foto_caminho}`;
      imgEl.classList.remove('hidden');
      placeholderEl.classList.add('hidden');
    } else {
      // Gerar iniciais do nome
      const initials = profile.nome
        .split(/\s+/)
        .map(word => word.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();
      
      placeholderEl.textContent = initials;
      placeholderEl.classList.remove('hidden');
      imgEl.classList.add('hidden');
    }
  } catch (err) {
    showNotification('Erro ao carregar dados do perfil: ' + err.message, 'error');
  }
}

