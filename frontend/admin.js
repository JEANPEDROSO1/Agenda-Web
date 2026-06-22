/**
 * Módulo Administrativo - Painel de Análise e Gerenciamento
 */

let usersChartInstance = null;
let eventsChartInstance = null;
let currentRange = 'mes';
let currentMonth = '';
let allUsers = [];
let adminConfirmCallback = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se o usuário está logado
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Verificar se o usuário tem privilégio de administrador na inicialização
  try {
    const me = await apiRequest(`${API_BASE}/auth/me`);
    if (!me.user || me.user.role !== 'admin') {
      showNotification('Acesso negado. Área exclusiva para administradores.', 'error');
      window.location.href = 'dashboard.html';
      return;
    }
  } catch (err) {
    console.error('Erro de autorização admin:', err);
    window.location.href = 'dashboard.html';
    return;
  }

  // Remove o bloqueio visual após validação
  document.body.classList.add('loaded');

  // Alternar abas do painel
  const tabBtnDashboard = document.getElementById('tabBtnDashboard');
  const tabBtnUsers = document.getElementById('tabBtnUsers');

  const adminDashboardSection = document.getElementById('adminDashboardSection');
  const adminUsersSection = document.getElementById('adminUsersSection');

  tabBtnDashboard.addEventListener('click', async () => {
    setActiveTab(tabBtnDashboard, adminDashboardSection);
    await loadDashboardStats();
  });

  tabBtnUsers.addEventListener('click', async () => {
    setActiveTab(tabBtnUsers, adminUsersSection);
    await loadUsersList();
  });

  // Configurar listeners dos filtros de gráficos
  const filterBtns = document.querySelectorAll('.filter-btn');
  const monthInput = document.getElementById('filterMonthSelect');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentRange = btn.getAttribute('data-range');

      if (currentRange !== 'mes') {
        monthInput.value = '';
        currentMonth = '';
      }
      if (currentRange !== 'semana') {
        currentWeekStart = '';
        currentWeekEnd = '';
      }
      if (currentRange !== 'dia') {
        currentDay = '';
      }

      await loadDashboardStats();
    });
  });

  monthInput.addEventListener('change', async () => {
    if (monthInput.value) {
      currentMonth = monthInput.value;
      currentRange = 'mes';
      
      filterBtns.forEach(b => {
        if (b.getAttribute('data-range') === 'mes') {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
      await loadDashboardStats();
    }
  });

  // Listeners dos Modais Customizados
  document.getElementById('cancelStatusChange')?.addEventListener('click', () => {
    document.getElementById('changeStatusConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmStatusChange')?.addEventListener('click', () => {
    if (adminConfirmCallback) adminConfirmCallback();
  });

  document.getElementById('cancelRoleChange')?.addEventListener('click', () => {
    document.getElementById('changeRoleConfirmModal').style.display = 'none';
  });
  document.getElementById('confirmRoleChange')?.addEventListener('click', () => {
    if (adminConfirmCallback) adminConfirmCallback();
  });

  const editUserModal = document.getElementById('editUserModal');
  document.getElementById('btnCancelEditUser')?.addEventListener('click', () => {
    editUserModal.style.display = 'none';
  });
  document.getElementById('btnCancelEditUserReal')?.addEventListener('click', () => {
    editUserModal.style.display = 'none';
  });

  document.getElementById('editUserForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = parseInt(document.getElementById('editUserId').value);
    const nome = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const status = document.getElementById('editUserStatus').value;
    const role = document.getElementById('editUserRole').value;
    const verificado = status === 'ativo' ? 1 : 0;
    
    const userOrig = usersList.find(u => u.id_usuario === userId);

    const performUpdate = async () => {
      try {
        const data = await apiRequest(`${API_BASE}/admin/users/${userId}`, {
          method: 'PUT',
          body: JSON.stringify({ nome, email, role, verificado })
        });
        showNotification('Alteração salva com sucesso!', 'success');
        editUserModal.style.display = 'none';
        await loadUsersList();
      } catch (err) {
        showNotification(err.message, 'error');
      }
    };

    if (userOrig && userOrig.role !== role) {
      const msg = role === 'admin' 
        ? 'Tem certeza que deseja tornar este usuário administrador?' 
        : 'Tem certeza que deseja remover o privilégio de administrador deste usuário?';
      
      showAdminConfirmModal('changeRoleConfirmModal', performUpdate, 'Alterar Privilégio', msg);
    } else {
      performUpdate();
    }
  });

  // Listeners dos filtros da tabela de usuários
  document.getElementById('adminUserSearchInput')?.addEventListener('input', () => {
    renderFilteredUsers();
  });
  document.getElementById('adminUserStatusFilter')?.addEventListener('change', () => {
    renderFilteredUsers();
  });
  document.getElementById('adminUserSort')?.addEventListener('change', () => {
    renderFilteredUsers();
  });

  // Carregar dados iniciais da dashboard
  await loadDashboardStats();
});

function setActiveTab(activeButton, activeSection) {
  // Resetar botões
  document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
  activeButton.classList.add('active');

  // Esconder todas as seções
  document.getElementById('adminDashboardSection').style.display = 'none';
  document.getElementById('adminUsersSection').style.display = 'none';

  // Mostrar seção ativa
  activeSection.style.display = 'block';
}

// ==========================================
// PAINEL ANALÍTICO E GRÁFICOS (CHART.JS)
// ==========================================

// Chart Drill-down State
let currentDay = '';
let currentWeekStart = '';
let currentWeekEnd = '';

function getPaddedData(dataArray, range) {
  let padded = [];
  const today = new Date();
  
  if (range === 'ano') {
    // Ultimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const label = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      padded.push({ data: label, count: 0 });
    }
  } else if (range === 'mes') {
    // Dias do mes selecionado ou ultimos 30 dias
    if (currentMonth) {
      const [year, month] = currentMonth.split('-');
      const daysInMonth = new Date(year, month, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const label = `${year}-${month}-${String(i).padStart(2,'0')}`;
        padded.push({ data: label, count: 0 });
      }
    } else {
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toISOString().split('T')[0];
        padded.push({ data: label, count: 0 });
      }
    }
  } else if (range === 'semana') {
    // 7 dias da semana selecionada ou ultimos 7
    if (currentWeekStart) {
      const start = new Date(currentWeekStart + 'T12:00:00');
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const label = d.toISOString().split('T')[0];
        padded.push({ data: label, count: 0 });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toISOString().split('T')[0];
        padded.push({ data: label, count: 0 });
      }
    }
  } else if (range === 'dia') {
    // 24 horas
    for (let i = 0; i < 24; i++) {
      const label = `${String(i).padStart(2,'0')}:00`;
      padded.push({ data: label, count: 0 });
    }
  }

  // Merge com os dados reais
  dataArray.forEach(item => {
    const found = padded.find(p => p.data === item.data);
    if (found) found.count = item.count;
  });

  return padded;
}

async function loadDashboardStats() {
  try {
    let url = `${API_BASE}/admin/dashboard?range=${currentRange}`;
    if (currentRange === 'mes' && currentMonth) url += `&mesSelect=${currentMonth}`;
    if (currentRange === 'dia' && currentDay) url += `&diaSelect=${currentDay}`;
    if (currentRange === 'semana' && currentWeekStart) url += `&semanaInicio=${currentWeekStart}&semanaFim=${currentWeekEnd}`;
    
    const data = await apiRequest(url);

    // Atualizar cartões de métricas
    document.getElementById('statUsers').textContent = data.metrics.totalUsers;
    document.getElementById('statGroups').textContent = data.metrics.totalGroups;
    document.getElementById('statEvents').textContent = data.metrics.totalEvents;

    // Pad arrays para garantir valores 0 onde não há compromissos
    const distData = getPaddedData(data.charts.eventDistribution, currentRange);
    const userData = getPaddedData(data.charts.userTimeline, currentRange);

    // Renderizar Gráficos
    renderUsersChart(userData);
    renderEventsChart(distData);

  } catch (err) {
    showNotification('Erro ao carregar estatísticas: ' + err.message, 'error');
  }
}

function renderUsersChart(timelineData) {
  const ctx = document.getElementById('usersChart').getContext('2d');
  if (usersChartInstance) usersChartInstance.destroy();

  const labels = timelineData.length > 0 ? timelineData.map(d => formatDateLabel(d.data, currentRange)) : ['Sem dados'];
  const counts = timelineData.length > 0 ? timelineData.map(d => d.count) : [0];

  // Premium Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
  gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

  usersChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Usuários Cadastrados',
        data: counts,
        borderColor: '#8b5cf6',
        backgroundColor: gradient,
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#8b5cf6',
        pointBorderColor: 'rgba(255,255,255,1)',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 }, stepSize: 1 } }
      }
    }
  });
}

function renderEventsChart(distributionData) {
  const ctx = document.getElementById('eventsChart').getContext('2d');
  if (eventsChartInstance) eventsChartInstance.destroy();

  const labels = distributionData.length > 0 ? distributionData.map(d => formatDateLabel(d.data, currentRange)) : ['Sem dados'];
  const counts = distributionData.length > 0 ? distributionData.map(d => d.count) : [0];
  const rawDates = distributionData.map(d => d.data);

  // Premium Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(59, 130, 246, 0.9)');
  gradient.addColorStop(1, 'rgba(14, 165, 233, 0.3)');

  eventsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Compromissos',
        data: counts,
        backgroundColor: gradient,
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: '#60a5fa'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (e, activeEls) => {
        if (activeEls.length > 0) {
          const index = activeEls[0].index;
          const rawDate = rawDates[index];
          drillDownChart(rawDate);
        }
      },
      onHover: (e, activeEls) => {
        e.native.target.style.cursor = activeEls.length > 0 && currentRange !== 'dia' ? 'pointer' : 'default';
      },
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit', size: 11 }, stepSize: 1 } }
      }
    }
  });
}

function drillDownChart(rawDate) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const updateActiveBtn = (range) => {
    filterBtns.forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-range="${range}"]`)?.classList.add('active');
  };

  if (currentRange === 'ano') {
    currentRange = 'mes';
    currentMonth = rawDate; // YYYY-MM
    document.getElementById('filterMonthSelect').value = currentMonth;
    updateActiveBtn('mes');
    loadDashboardStats();
  } else if (currentRange === 'mes') {
    currentRange = 'dia';
    currentDay = rawDate; // YYYY-MM-DD
    updateActiveBtn('dia');
    loadDashboardStats();
  }
}

function formatDateLabel(dateString, rangeType) {
  if (!dateString) return '';
  if (dateString.includes(':')) return dateString; // Horas
  const parts = dateString.split('-');
  
  if (rangeType === 'ano' && parts.length === 2) {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[parseInt(parts[1]) - 1]}/${parts[0].substring(2)}`;
  }
  if ((rangeType === 'mes' || rangeType === 'semana') && parts.length === 3) {
    const clickDate = new Date(dateString + 'T12:00:00');
    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return `${weekdays[clickDate.getDay()]} ${parts[2]}/${parts[1]}`;
  }
  return dateString;
}

// ==========================================
// GERENCIAMENTO DE USUÁRIOS
// ==========================================

async function loadUsersList() {
  const tbody = document.getElementById('adminUsersTableBody');
  tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Carregando usuários...</td></tr>';

  try {
    const data = await apiRequest(`${API_BASE}/admin/users`);
    allUsers = data.users || [];
    renderFilteredUsers();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #ef4444;">Erro: ${err.message}</td></tr>`;
  }
}

function renderFilteredUsers() {
  const tbody = document.getElementById('adminUsersTableBody');
  if (!tbody) return;

  const searchQuery = document.getElementById('adminUserSearchInput')?.value.toLowerCase().trim() || '';
  const statusFilter = document.getElementById('adminUserStatusFilter')?.value || 'todos';
  const sortOption = document.getElementById('adminUserSort')?.value || 'recentes';

  let filtered = allUsers.filter(u => {
    const matchesSearch = u.nome.toLowerCase().includes(searchQuery) || u.email.toLowerCase().includes(searchQuery);
    
    let matchesStatus = true;
    if (statusFilter === 'ativo') {
      matchesStatus = u.verificado === 1;
    } else if (statusFilter === 'inativo') {
      matchesStatus = u.verificado === 0;
    }
    
    return matchesSearch && matchesStatus;
  });

  if (sortOption === 'recentes') {
    filtered.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
  } else if (sortOption === 'antigos') {
    filtered.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));
  } else if (sortOption === 'nome-asc') {
    filtered.sort((a, b) => a.nome.localeCompare(b.nome));
  } else if (sortOption === 'nome-desc') {
    filtered.sort((a, b) => b.nome.localeCompare(a.nome));
  }

  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Nenhum usuário correspondente encontrado.</td></tr>';
    return;
  }

  const loggedUserId = parseInt(localStorage.getItem('userId'));

  filtered.forEach(u => {
    const tr = document.createElement('tr');

    const dateParts = u.criado_em ? u.criado_em.substring(0, 10).split('-') : [];
    const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : 'N/A';

    const isMe = u.id_usuario === loggedUserId;
    const statusBadge = u.verificado 
      ? '<span class="action-badge verified">Ativo</span>' 
      : '<span class="action-badge pending">Inativo</span>';

    const roleLabel = u.role === 'admin' 
      ? '<span class="group-badge admin">Admin</span>' 
      : '<span class="group-badge membro">Membro</span>';

    const editBtnHTML = `
      <button class="action-btn-circle" title="Editar Usuário" onclick="openEditUserModal(${JSON.stringify(u).replace(/"/g, '&quot;')})">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
    `;

    const deleteBtnHTML = isMe
      ? ''
      : `<button class="action-btn-circle danger" title="Deletar/Desativar Usuário" onclick="confirmDeleteUserAccount(${u.id_usuario})">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
         </button>`;

    tr.innerHTML = `
      <td>#${u.id_usuario}</td>
      <td style="font-weight: 600; color: #fff;">${u.nome}</td>
      <td>${u.email}</td>
      <td>${statusBadge}</td>
      <td>${formattedDate}</td>
      <td>${u.total_eventos || 0}</td>
      <td>${roleLabel}</td>
      <td>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          ${editBtnHTML}
          ${deleteBtnHTML}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function showAdminConfirmModal(modalId, onConfirm, titleText = null, descText = null) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (titleText) {
    const titleEl = modal.querySelector('h2');
    if (titleEl) titleEl.textContent = titleText;
  }
  if (descText) {
    const descEl = modal.querySelector('p');
    if (descEl) descEl.textContent = descText;
  }

  modal.style.display = 'flex';
  adminConfirmCallback = () => {
    onConfirm();
    modal.style.display = 'none';
  };
}

function openEditUserModal(user) {
  const modal = document.getElementById('editUserModal');
  document.getElementById('editUserId').value = user.id_usuario;
  document.getElementById('editUserName').value = user.nome;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserStatus').value = user.verificado === 1 ? 'ativo' : 'inativo';
  document.getElementById('editUserRole').value = user.role;
  
  modal.style.display = 'flex';
}

function confirmDeleteUserAccount(userId) {
  showAdminConfirmModal(
    'changeStatusConfirmModal',
    async () => {
      try {
        const data = await apiRequest(`${API_BASE}/admin/users/${userId}`, {
          method: 'DELETE'
        });
        showNotification(data.message || 'Conta de usuário excluída!', 'success');
        await loadUsersList();
      } catch (err) {
        showNotification(err.message, 'error');
      }
    },
    'Desativar/Excluir Conta',
    'Esta ação é irreversível e desativará permanentemente o acesso do usuário à plataforma.'
  );
}
