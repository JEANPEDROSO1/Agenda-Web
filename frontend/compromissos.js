// compromissos.js - Gerenciamento de eventos
console.log('Compromissos.js carregado');

// Verificar autenticação e carregar dados
document.addEventListener('DOMContentLoaded', function () {
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (!token || !userId) {
    window.location.href = 'login.html';
    return;
  }

  loadCompromissos();
  setupFormListeners();

  // Verificar se há uma data passada via query parameter (?date=YYYY-MM-DD)
  const urlParams = new URLSearchParams(window.location.search);
  const prefilledDate = urlParams.get('date');
  if (prefilledDate) {
    const createCard = document.getElementById('createCompromissoCard');
    const dateInput = document.getElementById('compromissoData');
    if (createCard && dateInput) {
      createCard.classList.remove('hidden');
      dateInput.value = prefilledDate;
      // Scroll smoothly to the form to make it visible and obvious to the user
      createCard.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

function setupFormListeners() {
  // Abrir formulário
  const openBtn = document.getElementById('openCreateCompromisso');
  const closeBtn = document.getElementById('closeCreateCompromisso');
  const createCard = document.getElementById('createCompromissoCard');

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      createCard.classList.remove('hidden');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      createCard.classList.add('hidden');
    });
  }

  // Fechar modal de edição
  const closeEditBtn = document.querySelector('.close');
  if (closeEditBtn) {
    closeEditBtn.addEventListener('click', () => {
      document.getElementById('editCompromissoModal').style.display = 'none';
    });
  }

  // Fechar modal clicando fora
  window.addEventListener('click', (event) => {
    const editModal = document.getElementById('editCompromissoModal');
    if (event.target === editModal) {
      editModal.style.display = 'none';
    }
  });

  // Criar novo compromisso
  document.getElementById('createCompromissoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await criarCompromisso(e);
  });

  // Editar compromisso
  document.getElementById('editCompromissoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarEdicaoCompromisso(e);
  });
}

async function criarCompromisso(e) {
  const titulo = document.getElementById('compromissoTitulo').value;
  const descricao = document.getElementById('compromissoDescricao').value;
  const data_evento = document.getElementById('compromissoData').value;
  const hora_evento = document.getElementById('compromissoHora').value;
  const urgencia = document.getElementById('compromissoUrgencia').value;
  const cor = document.getElementById('compromissoCor').value;
  const repeticao = document.getElementById('compromissoRepeticao').value;
  const alerta_minutos = parseInt(document.getElementById('compromissoAlerta').value) || 0;

  const button = e.target.querySelector('button');
  const originalText = button.textContent;
  button.textContent = 'Salvando...';
  button.disabled = true;

  try {
    await apiRequest(`${API_BASE}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos })
    });

    showNotification('Compromisso criado!', 'success');
    e.target.reset();
    loadCompromissos();
  } catch (error) {
    console.error('Erro ao criar:', error);
    showNotification('Erro: ' + error.message, 'error');
  } finally {
    button.textContent = originalText;
    button.disabled = false;
  }
}

let currentEditId = null;
let currentFilter = 'todos'; // 'todos' | 'ativos' | 'desativados'

window.setFilter = function (filter) {
  currentFilter = filter;

  // Atualiza botões
  document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
  const map = { todos: 'filterTodos', ativos: 'filterAtivos', desativados: 'filterDesativados' };
  document.getElementById(map[filter])?.classList.add('active');

  loadCompromissos();
}

function getNextOccurrence(dateStr, timeStr, repeticao) {
  const now = new Date();
  let nextDate = new Date(`${dateStr}T${timeStr || '00:00'}`);

  if (!repeticao || repeticao === 'nenhuma') return nextDate;

  while (nextDate < now) {
    if (repeticao === 'semanal') {
      nextDate.setDate(nextDate.getDate() + 7);
    } else if (repeticao === 'mensal') {
      nextDate.setMonth(nextDate.getMonth() + 1);
    } else if (repeticao === 'anual') {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else {
      break;
    }
  }
  return nextDate;
}

async function loadCompromissos() {
  const userId = localStorage.getItem('userId');
  const countSpan = document.getElementById('compromissosCount');
  const list = document.getElementById('compromissosList');

  try {
    // Adiciona cache buster para evitar respostas cacheadas pelo navegador
    const compromissos = await apiRequest(`${API_BASE}/events?_=${Date.now()}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    list.innerHTML = '';
    countSpan.textContent = `${compromissos.length} itens`;

    if (compromissos.length === 0) {
      list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">Nenhum compromisso. Comece criando um ao lado!</p>';
      return;
    }

    const now = new Date();

    // Ordenar: ativos primeiro (data crescente), passados no final
    compromissos.sort((a, b) => {
      const dateA = getNextOccurrence(a.data_evento.substring(0, 10), a.hora_evento, a.repeticao);
      const isPastA = dateA < now && (!a.repeticao || a.repeticao === 'nenhuma');

      const dateB = getNextOccurrence(b.data_evento.substring(0, 10), b.hora_evento, b.repeticao);
      const isPastB = dateB < now && (!b.repeticao || b.repeticao === 'nenhuma');

      if (isPastA && !isPastB) return 1;
      if (!isPastA && isPastB) return -1;
      return dateA - dateB;
    });

    // Filtrar conforme filtro selecionado
    const filtered = compromissos.filter(item => {
      const nextDate = getNextOccurrence(item.data_evento.substring(0, 10), item.hora_evento, item.repeticao);
      const isPast = nextDate < now && (!item.repeticao || item.repeticao === 'nenhuma');
      if (currentFilter === 'ativos') return !isPast;
      if (currentFilter === 'desativados') return isPast;
      return true;
    });

    countSpan.textContent = `${filtered.length} itens`;

    const btnDeleteAll = document.getElementById('btnDeleteAllPast');
    if (btnDeleteAll) {
      if (currentFilter === 'desativados' && filtered.length > 0) {
        btnDeleteAll.style.display = 'inline-block';
        btnDeleteAll.onclick = () => {
          const deleteAllModal = document.getElementById('deleteAllModal');
          const confirmBtn = document.getElementById('confirmDeleteAll');
          const cancelBtn = document.getElementById('cancelDeleteAll');

          if (deleteAllModal) {
            deleteAllModal.style.display = 'flex';

            // Remove listeners antigos
            const newConfirmBtn = confirmBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

            newCancelBtn.onclick = () => {
              deleteAllModal.style.display = 'none';
            };

            newConfirmBtn.onclick = async () => {
              const originalText = newConfirmBtn.textContent;
              newConfirmBtn.textContent = 'Excluir';
              newConfirmBtn.disabled = true;
              try {
                for (const item of filtered) {
                  await apiRequest(`${API_BASE}/events/${item.id_evento}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                  });
                }
                showNotification('Todos os compromissos desativados foram excluídos!', 'success');
                deleteAllModal.style.display = 'none';
                loadCompromissos();
              } catch (err) {
                console.error('Erro ao excluir em massa:', err);
                showNotification('Erro ao excluir compromissos', 'error');
                newConfirmBtn.textContent = originalText;
                newConfirmBtn.disabled = false;
              }
            };
          }
        };
      } else {
        btnDeleteAll.style.display = 'none';
      }
    }

    if (filtered.length === 0) {
      list.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">Nenhum compromisso encontrado.</p>';
      return;
    }

    filtered.forEach(item => {
      const card = document.createElement('div');
      card.className = 'compromisso-item';

      const nextDate = getNextOccurrence(item.data_evento.substring(0, 10), item.hora_evento, item.repeticao);
      const isPast = nextDate < now && (!item.repeticao || item.repeticao === 'nenhuma');

      if (isPast) {
        card.classList.add('past-event');
      }

      card.style.setProperty('--event-color', item.cor || '#3b82f6');

      const date = nextDate.toLocaleDateString('pt-BR');

      // Botão editar só aparece para eventos ativos (não passados)
      const editButton = isPast
        ? ''
        : `<button class="btn-edit" onclick="abrirEdicao(${item.id_evento}, '${item.titulo.replace(/'/g, "\\'")}', '${(item.descricao || '').replace(/'/g, "\\'")}', '${item.data_evento.substring(0, 10)}', '${item.hora_evento}', '${item.urgencia}', '${item.cor}', '${item.repeticao || 'nenhuma'}', ${item.alerta_minutos || 0})">Editar</button>`;

      const repeticaoLabel = {
        'semanal': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Semanal`,
        'mensal': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Mensal`,
        'anual': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Anual`
      };
      const repeticaoBadge = item.repeticao && item.repeticao !== 'nenhuma'
        ? `<span class="urgencia-badge normal" style="display: inline-flex; align-items: center;">${repeticaoLabel[item.repeticao] || item.repeticao}</span>`
        : '';

      const alertaBadge = item.alerta_minutos && item.alerta_minutos > 0
        ? `<span class="urgencia-badge normal" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); display: inline-flex; align-items: center;"><i data-lucide="bell" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Alerta ${item.alerta_minutos === 60 ? '1h' : item.alerta_minutos + ' min'}</span>`
        : '';

      card.innerHTML = `
        <div class="compromisso-header">
          <div class="compromisso-badges">
            <span class="urgencia-badge ${item.urgencia}">
              ${item.urgencia === 'urgente'
          ? `<i data-lucide="alert-triangle" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Urgente`
          : `<i data-lucide="pin" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Normal`}
            </span>
            ${repeticaoBadge}
            ${alertaBadge}
          </div>
          <h3>${item.titulo}</h3>
        </div>
        <p class="compromisso-descricao">${item.descricao || 'Sem descrição'}</p>
        <div class="compromisso-data">
          <i data-lucide="calendar" class="icon-inline"></i>
          <span>${date} às ${item.hora_evento}</span>
        </div>
        <div class="compromisso-actions">
          ${editButton}
          <button class="btn-delete" onclick="deletarCompromisso(${item.id_evento})">Excluir</button>
        </div>
      `;
      list.appendChild(card);
    });

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  } catch (error) {
    console.error('Erro ao carregar:', error);
    if (list) {
      list.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--danger); font-style: italic; padding: 20px;"><i data-lucide="alert-octagon" class="icon-inline" style="width: 14px; height: 14px; stroke-width: 2.5; color: var(--danger); margin-right: 4px; vertical-align: middle;"></i>Erro ao carregar compromissos: ${error.message}</p>`;
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }
}

window.abrirEdicao = function (id, titulo, descricao, data, hora, urgencia, cor, repeticao, alerta_minutos) {
  currentEditId = id;
  document.getElementById('editTitulo').value = titulo;
  document.getElementById('editDescricao').value = descricao;
  document.getElementById('editData').value = data.substring(0, 10);
  document.getElementById('editHora').value = hora;
  document.getElementById('editUrgencia').value = urgencia;
  document.getElementById('editCor').value = cor;
  document.getElementById('editRepeticao').value = repeticao || 'nenhuma';
  document.getElementById('editAlerta').value = alerta_minutos || 0;
  document.getElementById('editCompromissoModal').style.display = 'flex';
}

async function salvarEdicaoCompromisso(e) {
  const data = {
    titulo: document.getElementById('editTitulo').value,
    descricao: document.getElementById('editDescricao').value,
    data_evento: document.getElementById('editData').value,
    hora_evento: document.getElementById('editHora').value,
    urgencia: document.getElementById('editUrgencia').value,
    cor: document.getElementById('editCor').value,
    repeticao: document.getElementById('editRepeticao').value,
    alerta_minutos: parseInt(document.getElementById('editAlerta').value) || 0
  };

  try {
    await apiRequest(`${API_BASE}/events/${currentEditId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(data)
    });
    document.getElementById('editCompromissoModal').style.display = 'none';
    showNotification('Atualizado!', 'success');
    loadCompromissos();
  } catch (error) {
    showNotification('Erro ao atualizar', 'error');
  }
}

let currentDeleteId = null;

window.deletarCompromisso = function (id) {
  currentDeleteId = id;
  const deleteModal = document.getElementById('deleteModal');
  if (deleteModal) {
    deleteModal.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const cancelDeleteBtn = document.getElementById('cancelDelete');
  const confirmDeleteBtn = document.getElementById('confirmDelete');
  const deleteModal = document.getElementById('deleteModal');

  if (cancelDeleteBtn && deleteModal) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteModal.style.display = 'none';
      currentDeleteId = null;
    });
  }

  if (confirmDeleteBtn && deleteModal) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (!currentDeleteId) return;
      const originalText = confirmDeleteBtn.textContent;
      confirmDeleteBtn.textContent = 'Excluindo...';
      confirmDeleteBtn.disabled = true;
      try {
        await apiRequest(`${API_BASE}/events/${currentDeleteId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        showNotification('Excluído!', 'success');
        deleteModal.style.display = 'none';
        loadCompromissos();
      } catch (error) {
        showNotification('Erro ao excluir', 'error');
      } finally {
        confirmDeleteBtn.textContent = originalText;
        confirmDeleteBtn.disabled = false;
        currentDeleteId = null;
      }
    });
  }

  // Fechar modals clicando fora
  window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.style.display = 'none';
      currentDeleteId = null;
    }
    const deleteAllModal = document.getElementById('deleteAllModal');
    if (deleteAllModal && e.target === deleteAllModal) {
      deleteAllModal.style.display = 'none';
    }
  });
});
