/**
 * Módulo de Grupos, Calendário Compartilhado e Quadro Kanban (Trello) - Agenda Web
 */

let currentGroupId = null;
let currentGroupData = null; // Detalhes do grupo selecionado
let currentBoardId = null;
let currentSelectedCard = null; // Cartão Trello atualmente selecionado

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se o usuário está logado
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Carregar grupos inicialmente
  await loadGroups();

  // Configuração das Abas (Tabs) do Grupo
  const tabBtnAgenda = document.getElementById('tabBtnAgenda');
  const tabBtnTrello = document.getElementById('tabBtnTrello');
  const groupAgendaTab = document.getElementById('groupAgendaTab');
  const groupTrelloTab = document.getElementById('groupTrelloTab');

  tabBtnAgenda.addEventListener('click', () => {
    tabBtnAgenda.style.background = 'var(--primary)';
    tabBtnAgenda.style.borderColor = 'var(--primary)';
    tabBtnAgenda.style.color = '#fff';
    tabBtnAgenda.style.boxShadow = '';

    tabBtnTrello.style.background = 'rgba(255, 255, 255, 0.05)';
    tabBtnTrello.style.borderColor = 'var(--glass-border)';
    tabBtnTrello.style.color = '#fff';
    tabBtnTrello.style.boxShadow = 'none';

    groupAgendaTab.style.display = 'block';
    groupTrelloTab.style.display = 'none';
  });

  tabBtnTrello.addEventListener('click', async () => {
    tabBtnTrello.style.background = 'var(--primary)';
    tabBtnTrello.style.borderColor = 'var(--primary)';
    tabBtnTrello.style.color = '#fff';
    tabBtnTrello.style.boxShadow = '';

    tabBtnAgenda.style.background = 'rgba(255, 255, 255, 0.05)';
    tabBtnAgenda.style.borderColor = 'var(--glass-border)';
    tabBtnAgenda.style.color = '#fff';
    tabBtnAgenda.style.boxShadow = 'none';

    groupAgendaTab.style.display = 'none';
    groupTrelloTab.style.display = 'block';

    if (currentGroupId) {
      await loadTrelloBoard(currentGroupId);
    }
  });

  // Inicializar quadro Kanban
  document.getElementById('btnInitializeBoard').addEventListener('click', async () => {
    if (!currentGroupId) return;
    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/board`, {
        method: 'POST',
        body: JSON.stringify({ nome: 'Quadro de Tarefas' })
      });
      showNotification(data.message || 'Quadro inicializado!', 'success');
      await loadTrelloBoard(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Criar nova lista/coluna
  document.getElementById('createListForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('newListTitle').value.trim();
    if (!nome || !currentGroupId || !currentBoardId) return;

    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/lists`, {
        method: 'POST',
        body: JSON.stringify({ nome, id_quadro: currentBoardId })
      });
      showNotification(data.message || 'Coluna criada!', 'success');
      document.getElementById('newListTitle').value = '';
      await loadTrelloBoard(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Salvar detalhes do cartão
  document.getElementById('cardDetailsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentGroupId || !currentSelectedCard) return;

    const titulo = document.getElementById('cardTitleInput').value.trim();
    const descricao = document.getElementById('cardDescInput').value.trim();
    const prazo = document.getElementById('cardPrazoInput').value || null;
    const concluido = document.getElementById('cardStatusInput').checked;

    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/cards/${currentSelectedCard.id_cartao}`, {
        method: 'PUT',
        body: JSON.stringify({ titulo, descricao, prazo, concluido })
      });
      showNotification(data.message || 'Tarefa atualizada!', 'success');
      document.getElementById('cardDetailsModal').style.display = 'none';
      await loadTrelloBoard(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Fechar modal de detalhes do cartão
  document.getElementById('btnCancelCardDetails').addEventListener('click', () => {
    document.getElementById('cardDetailsModal').style.display = 'none';
  });

  // Deletar cartão
  document.getElementById('btnDeleteCard').addEventListener('click', async () => {
    if (!currentGroupId || !currentSelectedCard) return;
    if (!confirm('Deseja realmente excluir esta tarefa?')) return;

    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/cards/${currentSelectedCard.id_cartao}`, {
        method: 'DELETE'
      });
      showNotification(data.message || 'Tarefa excluída!', 'success');
      document.getElementById('cardDetailsModal').style.display = 'none';
      await loadTrelloBoard(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Escutar criação de grupo
  document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('newGroupName').value.trim();
    if (!nome) return;

    const btn = document.getElementById('btnCreateGroup');
    const originalContent = btn.innerHTML;
    btn.textContent = 'Criando...';
    btn.disabled = true;

    try {
      const data = await apiRequest(`${API_BASE}/groups`, {
        method: 'POST',
        body: JSON.stringify({ nome })
      });

      showNotification(data.message || 'Grupo criado com sucesso!', 'success');
      document.getElementById('newGroupName').value = '';
      await loadGroups();
    } catch (err) {
      showNotification(err.message, 'error');
    } finally {
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }
  });

  // Escutar convite de participante
  document.getElementById('inviteMemberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('inviteEmail').value.trim();
    if (!email || !currentGroupId) return;

    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email })
      });

      showNotification(data.message || 'Participante convidado!', 'success');
      document.getElementById('inviteEmail').value = '';
      await loadGroupDetails(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Voltar para listagem de grupos
  document.getElementById('btnBackToGroups').addEventListener('click', () => {
    currentGroupId = null;
    currentGroupData = null;
    currentBoardId = null;
    currentSelectedCard = null;
    document.getElementById('singleGroupSection').style.display = 'none';
    document.getElementById('groupsListSection').style.display = 'block';
    const inviteEmail = document.getElementById('inviteEmail');
    if (inviteEmail) inviteEmail.value = '';
    loadGroups();
  });

  // Modal: Criar/Editar Evento Compartilhado
  const addEventModal = document.getElementById('addEventModal');
  document.getElementById('btnOpenAddEventModal').addEventListener('click', () => {
    openCreateEventModal();
  });

  document.getElementById('btnCancelAddEvent').addEventListener('click', () => {
    addEventModal.style.display = 'none';
  });

  document.getElementById('btnCancelAddEventReal').addEventListener('click', () => {
    addEventModal.style.display = 'none';
  });

  document.getElementById('btnDeleteEvent').addEventListener('click', () => {
    const eventId = document.getElementById('editEventId').value;
    if (currentGroupId && eventId) {
      deleteGroupEvent(currentGroupId, eventId);
    }
  });

  addEventModal.addEventListener('click', (e) => {
    if (e.target === addEventModal) {
      addEventModal.style.display = 'none';
    }
  });

  document.getElementById('addGroupEventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentGroupId) return;

    const eventId = document.getElementById('editEventId').value;
    const titulo = document.getElementById('eventTitulo').value.trim();
    const descricao = document.getElementById('eventDescricao').value.trim();
    const data_evento = document.getElementById('eventData').value;
    const hora_evento = document.getElementById('eventHora').value;
    const urgencia = document.getElementById('eventUrgencia').value;
    const cor = document.getElementById('eventCor').value;
    const repeticao = document.getElementById('eventRepeticao').value;
    const alerta_minutos = parseInt(document.getElementById('eventAlerta').value);
    const local = document.getElementById('eventLocal').value.trim();

    const payload = { titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos, local };

    try {
      let data;
      if (eventId) {
        // Editar evento existente
        data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/events/${eventId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        showNotification(data.message || 'Compromisso de grupo atualizado!', 'success');
      } else {
        // Criar novo evento
        data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/events`, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        showNotification(data.message || 'Evento de grupo agendado!', 'success');
      }

      addEventModal.style.display = 'none';
      document.getElementById('addGroupEventForm').reset();
      await loadGroupEvents(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Navegação do Calendário
  document.getElementById('groupPrevMonth').addEventListener('click', () => {
    groupCurrentDate.setMonth(groupCurrentDate.getMonth() - 1);
    renderGroupCalendar();
  });

  document.getElementById('groupNextMonth').addEventListener('click', () => {
    groupCurrentDate.setMonth(groupCurrentDate.getMonth() + 1);
    renderGroupCalendar();
  });

  document.getElementById('groupToday').addEventListener('click', () => {
    groupCurrentDate = new Date();
    groupSelectedDate = new Date();
    renderGroupCalendar();
  });

  // Modal: Transferência de Propriedade
  const transferOwnerModal = document.getElementById('transferOwnerModal');
  document.getElementById('btnCancelTransfer').addEventListener('click', () => {
    transferOwnerModal.style.display = 'none';
  });

  document.getElementById('btnConfirmTransfer').addEventListener('click', async () => {
    const novoDonoId = document.getElementById('transferSelect').value;
    if (!novoDonoId || !currentGroupId) return;

    try {
      const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/transfer-owner`, {
        method: 'PUT',
        body: JSON.stringify({ novoDonoId })
      });

      showNotification(data.message || 'Propriedade transferida!', 'success');
      transferOwnerModal.style.display = 'none';
      await loadGroupDetails(currentGroupId);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });

  // Botões de Confirmação dos Modais Customizados
  document.getElementById('cancelDeleteGroup').addEventListener('click', () => {
    document.getElementById('deleteGroupConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmDeleteGroup').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });

  document.getElementById('cancelDeleteEvent').addEventListener('click', () => {
    document.getElementById('deleteEventConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmDeleteEvent').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });

  document.getElementById('cancelLeaveGroup').addEventListener('click', () => {
    document.getElementById('leaveGroupConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmLeaveGroup').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });

  document.getElementById('cancelRemoveMember').addEventListener('click', () => {
    document.getElementById('removeMemberConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmRemoveMember').addEventListener('click', () => {
    if (confirmCallback) confirmCallback();
  });
});

// Carregar e listar todos os grupos
async function loadGroups() {
  const grid = document.getElementById('groupsGrid');
  try {
    const data = await apiRequest(`${API_BASE}/groups`);
    grid.innerHTML = '';

    const list = data.groups || [];
    if (list.length === 0) {
      grid.innerHTML = `
        <div class="glass-card" style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--text-muted);">
          Você não participa de nenhum grupo ainda. Crie um grupo acima para começar a colaborar!
        </div>
      `;
      return;
    }

    const userId = parseInt(localStorage.getItem('userId'));

    list.forEach(g => {
      const card = document.createElement('div');
      card.className = 'glass-card group-card';

      let roleLabel = 'Membro';
      let roleClass = 'membro';
      if (g.id_criador === userId) {
        roleLabel = 'Dono';
        roleClass = 'dono';
      } else if (g.funcao === 'admin') {
        roleLabel = 'Admin';
        roleClass = 'admin';
      }

      card.innerHTML = `
        <div>
          <div class="group-card-header">
            <h3 class="group-card-title">${g.nome}</h3>
            <span class="group-badge ${roleClass}">${roleLabel}</span>
          </div>
          <div class="group-card-info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px; stroke-width: 2.5;"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>${g.total_membros} ${g.total_membros === 1 ? 'membro' : 'membros'}</span>
          </div>
        </div>
        <button class="group-card-btn" onclick="enterGroup(${g.id_grupo})">Gerenciar & Agenda</button>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<p style="color: #ef4444;">Erro ao carregar grupos: ${err.message}</p>`;
  }
}

// Entrar no modo de detalhes do grupo (SPA)
async function enterGroup(id_grupo) {
  currentGroupId = id_grupo;
  document.getElementById('groupsListSection').style.display = 'none';
  document.getElementById('singleGroupSection').style.display = 'block';
  
  // Garantir a aba Agenda como padrão ao entrar
  document.getElementById('tabBtnAgenda').click();
  
  await loadGroupDetails(id_grupo);
  await loadGroupEvents(id_grupo);
}

// Carregar detalhes, membros e permissões do grupo
async function loadGroupDetails(id_grupo) {
  try {
    const data = await apiRequest(`${API_BASE}/groups/${id_grupo}`);
    currentGroupData = data;

    const group = data.group;
    const members = data.members;
    const minhaFuncao = data.minhaFuncao;
    const loggedUserId = parseInt(localStorage.getItem('userId'));
    const isOwner = group.id_criador === loggedUserId;
    const isAdmin = minhaFuncao === 'admin';

    document.getElementById('groupDetailName').textContent = group.nome;
    
    const badgeEl = document.getElementById('groupDetailRole');
    badgeEl.className = 'group-badge';
    if (isOwner) {
      badgeEl.textContent = 'Dono';
      badgeEl.classList.add('dono');
    } else if (isAdmin) {
      badgeEl.textContent = 'Admin';
      badgeEl.classList.add('admin');
    } else {
      badgeEl.textContent = 'Membro';
      badgeEl.classList.add('membro');
    }

    const actionContainer = document.getElementById('groupActionButtons');
    actionContainer.innerHTML = '';

    if (isOwner) {
      const btnDelete = document.createElement('button');
      btnDelete.className = 'btn-danger-glass';
      btnDelete.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Excluir Grupo`;
      btnDelete.onclick = () => confirmDeleteGroup(id_grupo);
      actionContainer.appendChild(btnDelete);
    } else {
      const btnLeave = document.createElement('button');
      btnLeave.className = 'btn-danger-glass';
      btnLeave.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 18px; height: 18px;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg> Sair do Grupo`;
      btnLeave.onclick = () => confirmLeaveGroup(id_grupo, loggedUserId);
      actionContainer.appendChild(btnLeave);
    }

    const inviteEl = document.getElementById('inviteMemberContainer');
    const addEventBtn = document.getElementById('btnOpenAddEventModal');
    if (isAdmin || isOwner) {
      inviteEl.style.display = 'block';
      if (addEventBtn) addEventBtn.style.display = 'inline-flex';
    } else {
      inviteEl.style.display = 'none';
      if (addEventBtn) addEventBtn.style.display = 'none';
    }

    const membersListEl = document.getElementById('groupMembersList');
    membersListEl.innerHTML = '';

    members.forEach(m => {
      const item = document.createElement('div');
      item.className = 'member-item';

      let avatarHTML = '';
      if (m.foto_caminho) {
        avatarHTML = `<img src="${API_BASE}${m.foto_caminho}" alt="Foto de ${m.nome}">`;
      } else {
        const initials = m.nome.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
        avatarHTML = `<span>${initials}</span>`;
      }

      let mRoleLabel = 'Membro';
      let mRoleClass = 'membro';
      if (m.id_usuario === group.id_criador) {
        mRoleLabel = 'Dono';
        mRoleClass = 'dono';
      } else if (m.funcao === 'admin') {
        mRoleLabel = 'Admin';
        mRoleClass = 'admin';
      }

      let actionsHTML = '';
      const isMe = m.id_usuario === loggedUserId;
      const isTargetOwner = m.id_usuario === group.id_criador;

      if ((isAdmin || isOwner) && !isMe) {
        if (!isTargetOwner) {
          const roleTitle = m.funcao === 'admin' ? 'Rebaixar para Membro' : 'Promover a Administrador';
          const nextRole = m.funcao === 'admin' ? 'membro' : 'admin';
          actionsHTML += `
            <button class="action-btn-circle" title="${roleTitle}" onclick="changeMemberRole(${id_grupo}, ${m.id_usuario}, '${nextRole}')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="${m.funcao === 'admin' ? 'M6 9l6 6 6-6' : 'M18 15l-6-6-6 6'}"/></svg>
            </button>
          `;
        }

        if (isOwner && !isTargetOwner) {
          actionsHTML += `
            <button class="action-btn-circle owner" title="Transferir Propriedade do Grupo" onclick="openTransferModal(${m.id_usuario})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </button>
          `;
        }

        const canRemove = isOwner || (isAdmin && m.funcao === 'membro');
        if (canRemove && !isTargetOwner) {
          actionsHTML += `
            <button class="action-btn-circle danger" title="Remover Membro" onclick="confirmLeaveGroup(${id_grupo}, ${m.id_usuario})">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          `;
        }
      }

      item.innerHTML = `
        <div class="member-info">
          <div class="member-avatar">
            ${avatarHTML}
          </div>
          <div class="member-meta">
            <div class="member-name">${m.nome} ${isMe ? '(Você)' : ''}</div>
            <div class="member-email">${m.email}</div>
          </div>
        </div>
        <div class="member-actions">
          <span class="group-badge ${mRoleClass}" style="margin-right: 5px;">${mRoleLabel}</span>
          ${actionsHTML}
        </div>
      `;
      membersListEl.appendChild(item);
    });

  } catch (err) {
    showNotification('Erro ao carregar detalhes do grupo: ' + err.message, 'error');
  }
}

// Mudar função do membro
async function changeMemberRole(id_grupo, userId, nextRole) {
  try {
    const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ funcao: nextRole })
    });
    showNotification(data.message || 'Função do membro atualizada!', 'success');
    await loadGroupDetails(id_grupo);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Transferência de Dono Modal
function openTransferModal(currentSelectedMemberId) {
  const select = document.getElementById('transferSelect');
  select.innerHTML = '';

  const members = currentGroupData.members || [];
  const candidates = members.filter(m => m.id_usuario !== currentGroupData.group.id_criador);

  if (candidates.length === 0) {
    showNotification('Não há outros membros aptos a receber a propriedade do grupo.', 'error');
    return;
  }

  candidates.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id_usuario;
    opt.textContent = `${c.nome} (${c.email})`;
    select.appendChild(opt);
  });

  document.getElementById('transferOwnerModal').style.display = 'flex';
}
// Global states for Group Calendar
let groupCurrentDate = new Date();
let groupSelectedDate = new Date();
let groupEvents = [];
let confirmCallback = null;

// Helper to open custom confirmation modals
function showConfirmModal(modalId, onConfirm, textId = null, textContent = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;
  
  if (textId && textContent) {
    const textEl = document.getElementById(textId);
    if (textEl) textEl.textContent = textContent;
  }

  modal.style.display = 'flex';
  confirmCallback = () => {
    onConfirm();
    modal.style.display = 'none';
  };
}

// Sair do grupo ou Remover Membro
async function confirmLeaveGroup(id_grupo, userId) {
  const isMe = userId === parseInt(localStorage.getItem('userId'));
  if (isMe) {
    showConfirmModal('leaveGroupConfirmModal', async () => {
      try {
        const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/members/${userId}`, {
          method: 'DELETE'
        });
        showNotification(data.message || 'Participação removida!', 'success');
        document.getElementById('btnBackToGroups').click();
      } catch (err) {
        showNotification(err.message, 'error');
      }
    });
  } else {
    const member = currentGroupData?.members?.find(m => m.id_usuario === userId);
    const name = member ? member.nome : 'este membro';
    showConfirmModal('removeMemberConfirmModal', async () => {
      try {
        const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/members/${userId}`, {
          method: 'DELETE'
        });
        showNotification(data.message || 'Membro removido do grupo!', 'success');
        await loadGroupDetails(id_grupo);
      } catch (err) {
        showNotification(err.message, 'error');
      }
    }, 'removeMemberText', `Tem certeza de que deseja remover ${name} do grupo?`);
  }
}

// Excluir Grupo por completo
async function confirmDeleteGroup(id_grupo) {
  showConfirmModal('deleteGroupConfirmModal', async () => {
    try {
      const data = await apiRequest(`${API_BASE}/groups/${id_grupo}`, {
        method: 'DELETE'
      });
      showNotification(data.message || 'Grupo excluído permanentemente!', 'success');
      document.getElementById('btnBackToGroups').click();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });
}

// ==========================================
// EVENTOS DO GRUPO (CALENDÁRIO COMPARTILHADO)
// ==========================================

async function loadGroupEvents(id_grupo) {
  try {
    const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/events`);
    groupEvents = data.events || [];
    renderGroupCalendar();
  } catch (err) {
    console.error('Erro ao carregar eventos:', err);
    showNotification('Erro ao carregar eventos do grupo: ' + err.message, 'error');
  }
}

async function deleteGroupEvent(id_grupo, eventId) {
  showConfirmModal('deleteEventConfirmModal', async () => {
    try {
      const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/events/${eventId}`, {
        method: 'DELETE'
      });
      showNotification(data.message || 'Compromisso excluído!', 'success');
      document.getElementById('addEventModal').style.display = 'none';
      await loadGroupEvents(id_grupo);
    } catch (err) {
      showNotification(err.message, 'error');
    }
  });
}

function renderGroupCalendar() {
  const calendarDays = document.getElementById('groupCalendarDays');
  const monthYearLabel = document.getElementById('groupMonthYear');
  if (!calendarDays || !monthYearLabel) return;

  calendarDays.innerHTML = '';

  const year = groupCurrentDate.getFullYear();
  const month = groupCurrentDate.getMonth();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  monthYearLabel.textContent = `${monthNames[month]} ${year}`;

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();

  // Dias do mês anterior
  for (let i = firstDayIndex; i > 0; i--) {
    const day = prevLastDay - i + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-day other-month';
    cell.textContent = day;
    calendarDays.appendChild(cell);
  }

  // Dias do mês atual
  const today = new Date();
  for (let day = 1; day <= totalDays; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    cell.textContent = day;

    const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }

    if (day === groupSelectedDate.getDate() && month === groupSelectedDate.getMonth() && year === groupSelectedDate.getFullYear()) {
      cell.classList.add('selected');
    }

    // Dots de eventos
    const dayEvents = groupEvents.filter(e => e.data_evento.substring(0, 10) === cellDateStr);
    if (dayEvents.length > 0) {
      const dotContainer = document.createElement('div');
      dotContainer.className = 'event-dots-container';
      dotContainer.style.display = 'flex';
      dotContainer.style.justifyContent = 'center';
      dotContainer.style.gap = '2px';
      dotContainer.style.marginTop = '2px';

      dayEvents.slice(0, 3).forEach(evt => {
        const dot = document.createElement('span');
        dot.className = 'event-dot';
        dot.style.width = '6px';
        dot.style.height = '6px';
        dot.style.borderRadius = '50%';
        dot.style.background = evt.cor || '#8b5cf6';
        dotContainer.appendChild(dot);
      });
      cell.appendChild(dotContainer);
    }

    cell.addEventListener('click', () => {
      groupSelectedDate = new Date(year, month, day);
      calendarDays.querySelectorAll('.calendar-day.selected').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      renderGroupEventsList();
    });

    calendarDays.appendChild(cell);
  }

  // Dias do próximo mês
  const totalCells = firstDayIndex + totalDays;
  const nextDays = 42 - totalCells;
  for (let i = 1; i <= nextDays; i++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day other-month';
    cell.textContent = i;
    calendarDays.appendChild(cell);
  }

  renderGroupEventsList();
}

function renderGroupEventsList() {
  const eventsListEl = document.getElementById('groupEventsList');
  const selectedDayLabel = document.getElementById('selectedGroupDayLabel');
  if (!eventsListEl || !selectedDayLabel) return;

  const y = groupSelectedDate.getFullYear();
  const m = groupSelectedDate.getMonth() + 1;
  const d = groupSelectedDate.getDate();
  const selectedDateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  selectedDayLabel.textContent = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  eventsListEl.innerHTML = '';

  const filtered = groupEvents.filter(e => e.data_evento.substring(0, 10) === selectedDateStr);

  if (filtered.length === 0) {
    eventsListEl.innerHTML = `
      <p style="text-align: center; color: var(--text-muted); font-style: italic; padding: 20px 0;">
        Nenhum compromisso agendado para este dia.
      </p>
    `;
    return;
  }

  const loggedUserId = parseInt(localStorage.getItem('userId'));
  const minhaFuncao = currentGroupData ? currentGroupData.minhaFuncao : 'membro';
  const isAdminOrOwner = minhaFuncao === 'admin' || currentGroupData?.group?.id_criador === loggedUserId;

  filtered.forEach(e => {
    const card = document.createElement('div');
    card.className = 'compromisso-item';
    card.style.setProperty('--event-color', e.cor || '#3b82f6');

    let repeticaoBadge = '';
    if (e.repeticao && e.repeticao !== 'nenhuma') {
      const repeticaoLabel = {
        'semanal': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Semanal`,
        'mensal': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Mensal`,
        'anual': `<i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px; margin-top: -2px;"></i>Anual`
      };
      repeticaoBadge = `<span class="urgencia-badge normal" style="display: inline-flex; align-items: center;">${repeticaoLabel[e.repeticao] || e.repeticao}</span>`;
    }

    let alertaBadge = '';
    if (e.alerta_minutos && e.alerta_minutos > 0) {
      alertaBadge = `<span class="urgencia-badge normal" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); display: inline-flex; align-items: center;"><i data-lucide="bell" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Alerta ${e.alerta_minutos === 60 ? '1h' : e.alerta_minutos + ' min'}</span>`;
    }

    const urgencyBadge = `<span class="urgencia-badge ${e.urgencia || 'normal'}">
      ${e.urgencia === 'urgente'
        ? `<i data-lucide="alert-triangle" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Urgente`
        : `<i data-lucide="pin" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>Normal`}
    </span>`;

    const formattedDate = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    
    let actionsHtml = '';
    if (isAdminOrOwner) {
      actionsHtml = `
        <div class="compromisso-actions">
          <button class="btn-edit" onclick='openEditEventModal(${JSON.stringify(e).replace(/'/g, "&apos;")})'>Editar</button>
          <button class="btn-delete" onclick="deleteGroupEvent(${currentGroupData.group.id_grupo}, ${e.id_grupo_evento})">Excluir</button>
        </div>
      `;
    }

    const localInfo = e.local ? `<div style="margin-top: 8px; font-size: 0.85rem; color: var(--text-muted);"><i data-lucide="map-pin" style="width: 12px; height: 12px; vertical-align: middle; margin-right: 4px;"></i><strong>Local:</strong> ${e.local}</div>` : '';

    card.innerHTML = `
      <div class="compromisso-header">
        <div class="compromisso-badges">
          ${urgencyBadge}
          ${repeticaoBadge}
          ${alertaBadge}
        </div>
        <h3>${e.titulo}</h3>
      </div>
      <p class="compromisso-descricao">${e.descricao || 'Sem descrição'}</p>
      ${localInfo}
      <div class="compromisso-data">
        <i data-lucide="calendar" class="icon-inline"></i>
        <span>${formattedDate} às ${e.hora_evento.substring(0, 5)}</span>
      </div>
      ${actionsHtml}
    `;
    
    eventsListEl.appendChild(card);
  });
  
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

function openCreateEventModal() {
  const modal = document.getElementById('addEventModal');
  document.getElementById('groupEventModalTitle').textContent = 'Agendar no Grupo';
  document.getElementById('editEventId').value = '';
  document.getElementById('addGroupEventForm').reset();
  
  const y = groupSelectedDate.getFullYear();
  const m = groupSelectedDate.getMonth() + 1;
  const d = groupSelectedDate.getDate();
  document.getElementById('eventData').value = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  
  document.getElementById('btnDeleteEvent').style.display = 'none';
  modal.style.display = 'flex';
}

function openEditEventModal(e) {
  const modal = document.getElementById('addEventModal');
  document.getElementById('groupEventModalTitle').textContent = 'Editar Compromisso';
  document.getElementById('editEventId').value = e.id_grupo_evento;
  
  document.getElementById('eventTitulo').value = e.titulo;
  document.getElementById('eventDescricao').value = e.descricao || '';
  document.getElementById('eventData').value = e.data_evento.substring(0, 10);
  document.getElementById('eventHora').value = e.hora_evento.substring(0, 5);
  document.getElementById('eventUrgencia').value = e.urgencia || 'normal';
  document.getElementById('eventCor').value = e.cor || '#8b5cf6';
  document.getElementById('eventRepeticao').value = e.repeticao || 'nenhuma';
  document.getElementById('eventAlerta').value = e.alerta_minutos || '0';
  document.getElementById('eventLocal').value = e.local || '';
  
  document.getElementById('btnDeleteEvent').style.display = 'block';
  modal.style.display = 'flex';
}

// ==========================================
// QUADRO KANBAN (TRELLO)
// ==========================================

async function loadTrelloBoard(id_grupo) {
  const uninitSection = document.getElementById('trelloUninitialized');
  const boardSection = document.getElementById('trelloBoardContainer');
  const canvas = document.getElementById('trelloBoardCanvas');

  try {
    const data = await apiRequest(`${API_BASE}/groups/${id_grupo}/trello/board`);
    
    if (!data.board) {
      // Quadro não inicializado
      uninitSection.style.display = 'block';
      boardSection.style.display = 'none';
      currentBoardId = null;
      return;
    }

    // Quadro inicializado
    uninitSection.style.display = 'none';
    boardSection.style.display = 'block';
    currentBoardId = data.board.id_quadro;

    document.getElementById('trelloBoardTitle').textContent = data.board.nome;
    canvas.innerHTML = '';

    const lists = data.lists || [];
    const cards = data.cards || [];

    lists.forEach(list => {
      const col = document.createElement('div');
      col.className = 'trello-column';

      const listCards = cards.filter(c => c.id_lista === list.id_lista);

      // Renderizar cartões da coluna
      let cardsHTML = '';
      listCards.forEach(c => {
        // Formatar prazo se existir
        let prazoHTML = '';
        if (c.prazo) {
          const dateParts = c.prazo.substring(0, 10).split('-');
          const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
          
          const isExpired = new Date(c.prazo) < new Date() && !c.concluido;
          prazoHTML = `<span class="trello-card-date ${isExpired ? 'expired' : ''}">${formattedDate}</span>`;
        }

        // Avatars de responsáveis
        let assigneesHTML = '';
        if (c.responsaveis && c.responsaveis.length > 0) {
          c.responsaveis.slice(0, 3).forEach(resp => {
            if (resp.foto_caminho) {
              assigneesHTML += `
                <div class="trello-card-assignee-avatar" title="${resp.nome}">
                  <img src="${API_BASE}${resp.foto_caminho}" alt="${resp.nome}">
                </div>`;
            } else {
              const initials = resp.nome.split(/\s+/).map(n => n[0]).slice(0, 2).join('').toUpperCase();
              assigneesHTML += `
                <div class="trello-card-assignee-avatar" title="${resp.nome}">
                  ${initials}
                </div>`;
            }
          });
          if (c.responsaveis.length > 3) {
            assigneesHTML += `<div class="trello-card-assignee-avatar" style="background:#4b5563;">+${c.responsaveis.length - 3}</div>`;
          }
        }

        // Indicador de descrição
        const descIndicator = c.descricao ? `<span class="trello-card-desc-indicator" title="Tem descrição"><i data-lucide="file-text" style="width:12px;height:12px;"></i></span>` : '';

        cardsHTML += `
          <div class="trello-card ${c.concluido ? 'completed' : ''}" onclick="openCardDetails(${JSON.stringify(c).replace(/"/g, '&quot;')})">
            <div class="trello-card-title">${c.titulo}</div>
            ${descIndicator}
            <div class="trello-card-meta">
              ${prazoHTML}
              <div class="trello-card-assignees">
                ${assigneesHTML}
              </div>
            </div>
          </div>
        `;
      });

      col.innerHTML = `
        <div class="trello-column-header">
          <h3 class="trello-column-title">${list.nome}</h3>
          <button class="action-btn-circle danger" title="Excluir Coluna" onclick="deleteTrelloList(${list.id_lista})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="trello-cards-container">
          ${cardsHTML}
        </div>
        <form class="trello-add-card-form" onsubmit="handleAddCard(event, ${list.id_lista})">
          <input type="text" placeholder="Adicionar tarefa..." required maxlength="255">
          <button type="submit">+</button>
        </form>
      `;

      canvas.appendChild(col);
    });

  } catch (err) {
    canvas.innerHTML = `<p style="color: #ef4444;">Erro ao carregar Kanban: ${err.message}</p>`;
  }
}

// Excluir lista Kanban
async function deleteTrelloList(listId) {
  if (!confirm('Deseja realmente excluir esta coluna e todas as suas tarefas?')) return;

  try {
    const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/lists/${listId}`, {
      method: 'DELETE'
    });
    showNotification(data.message || 'Coluna excluída!', 'success');
    await loadTrelloBoard(currentGroupId);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Adicionar Cartão Kanban
async function handleAddCard(event, listId) {
  event.preventDefault();
  const form = event.target;
  const input = form.querySelector('input');
  const titulo = input.value.trim();
  if (!titulo || !currentGroupId) return;

  try {
    const data = await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/cards`, {
      method: 'POST',
      body: JSON.stringify({ id_lista: listId, titulo })
    });
    showNotification(data.message || 'Tarefa adicionada!', 'success');
    input.value = '';
    await loadTrelloBoard(currentGroupId);
  } catch (err) {
    showNotification(err.message, 'error');
  }
}

// Abrir detalhes do cartão
function openCardDetails(card) {
  currentSelectedCard = card;

  document.getElementById('cardTitleInput').value = card.titulo;
  document.getElementById('cardDescInput').value = card.descricao || '';
  document.getElementById('cardPrazoInput').value = card.prazo ? card.prazo.substring(0, 10) : '';
  document.getElementById('cardStatusInput').checked = card.concluido === 1;

  // Renderizar checkboxes de responsáveis
  const assigneesList = document.getElementById('cardAssigneesList');
  assigneesList.innerHTML = '';

  const groupMembers = currentGroupData.members || [];
  const cardResponsaveis = card.responsaveis || [];

  groupMembers.forEach(m => {
    const isAssigned = cardResponsaveis.some(r => r.id_usuario === m.id_usuario);
    
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '10px';

    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = `assignee-${m.id_usuario}`;
    chk.checked = isAssigned;
    chk.style.cursor = 'pointer';
    chk.onchange = (e) => toggleAssignee(m.id_usuario, e.target.checked);

    const lbl = document.createElement('label');
    lbl.htmlFor = `assignee-${m.id_usuario}`;
    lbl.textContent = `${m.nome} (${m.email})`;
    lbl.style.margin = '0';
    lbl.style.cursor = 'pointer';
    lbl.style.fontSize = '0.9rem';

    wrapper.appendChild(chk);
    wrapper.appendChild(lbl);
    assigneesList.appendChild(wrapper);
  });

  document.getElementById('cardDetailsModal').style.display = 'flex';
}

// Adicionar/Remover responsáveis no cartão
async function toggleAssignee(userId, isAssign) {
  if (!currentGroupId || !currentSelectedCard) return;

  try {
    if (isAssign) {
      await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/cards/${currentSelectedCard.id_cartao}/assignees`, {
        method: 'POST',
        body: JSON.stringify({ id_usuario: userId })
      });
    } else {
      await apiRequest(`${API_BASE}/groups/${currentGroupId}/trello/cards/${currentSelectedCard.id_cartao}/assignees/${userId}`, {
        method: 'DELETE'
      });
    }
  } catch (err) {
    showNotification(err.message, 'error');
  }
}
