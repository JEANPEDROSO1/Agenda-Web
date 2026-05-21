// Usando API_BASE definido globalmente no script.js
console.log('Dashboard.js carregado');

// Verificar autenticação
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM carregado, verificando se é dashboard...');
  const token = localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  if (!token || !userId) {
    console.log('Usuário não autenticado, redirecionando para login');
    window.location.href = 'login.html';
    return;
  } else {
    console.log('Usuário autenticado, carregando dashboard...');
    console.log('Token:', token.substring(0, 20) + '...');
    console.log('UserId:', userId);
    initCalendar();
    loadDashboardEvents();
  }
});

// Recarregar eventos quando voltar para a página (sincronizar compromissos)
window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    console.log('Voltando para dashboard, recarregando eventos...');
    loadDashboardEvents();
  }
});

// Recarregar eventos a cada 3 segundos para sincronização em tempo real
setInterval(function() {
  const token = localStorage.getItem('token');
  if (token && window.location.href.includes('dashboard.html')) {
    loadDashboardEvents();
  }
}, 3000);

// Calendário
let currentDate = new Date();
let events = [];

function initCalendar() {
  console.log('initCalendar chamado');
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
  renderCalendar();
}

function renderCalendar() {
  console.log('renderCalendar chamado');
  const calendar = document.getElementById('calendar');
  const monthYear = document.getElementById('monthYear');
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const monthName = getMonthName(month);
  const displayText = `${monthName} ${year}`;
  
  monthYear.textContent = displayText;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  calendar.innerHTML = '';
  
  let date = new Date(startDate);
  for (let i = 0; i < 42; i++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    const dayNumber = date.getDate();
    dayDiv.textContent = dayNumber;
    dayDiv.setAttribute('data-date', date.toISOString().split('T')[0]);
    
    if (date.getMonth() !== month) {
      dayDiv.classList.add('other-month');
    }
    
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      dayDiv.classList.add('today');
    }
    
    // Verificar se há eventos nesta data
    const yearStr = date.getFullYear();
    const monthStr = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
    const dayEvents = events.filter(event => {
      const eventDateStr = event.data_evento.substring(0, 10);
      return eventDateStr === dateStr;
    });
    if (dayEvents.length > 0) {
      dayDiv.classList.add('has-event');
      const eventColor = dayEvents[0].cor || '#3b82f6';
      dayDiv.style.setProperty('--event-color', eventColor);
    }
    
    calendar.appendChild(dayDiv);
    date.setDate(date.getDate() + 1);
  }
  
  console.log('Calendário renderizado');
  renderEventsList();
}

function getMonthName(month) {
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  return months[month];
}

// Função para fazer requisições com melhor tratamento de erro
async function apiRequest(url, options = {}) {
  try {
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
      throw new Error(`Erro ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

// Carregar eventos para a dashboard (apenas visualização)
async function loadDashboardEvents() {
  const userId = localStorage.getItem('userId');
  console.log('Carregando eventos para userId:', userId);
  
  try {
    const eventsData = await apiRequest(`${API_BASE}/events/${userId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    console.log('Eventos recebidos:', eventsData);
    
    // Expandir eventos recorrentes em ocorrências virtuais
    const expandedEvents = [];
    const baseEvents = eventsData || [];
    
    baseEvents.forEach(event => {
      // Sempre adiciona o evento original
      expandedEvents.push(event);
      
      const rep = event.repeticao;
      if (!rep || rep === 'nenhuma') return;
      
      const baseDate = new Date(event.data_evento.substring(0, 10) + 'T12:00:00');
      const maxOccurrences = rep === 'semanal' ? 520 : (rep === 'mensal' ? 120 : 10);
      
      for (let i = 1; i <= maxOccurrences; i++) {
        const newDate = new Date(baseDate);
        
        if (rep === 'semanal') {
          newDate.setDate(newDate.getDate() + (7 * i));
        } else if (rep === 'mensal') {
          newDate.setMonth(newDate.getMonth() + i);
        } else if (rep === 'anual') {
          newDate.setFullYear(newDate.getFullYear() + i);
        }
        
        const year = newDate.getFullYear();
        const month = String(newDate.getMonth() + 1).padStart(2, '0');
        const day = String(newDate.getDate()).padStart(2, '0');
        
        expandedEvents.push({
          ...event,
          data_evento: `${year}-${month}-${day}`,
          _virtual: true // Marca como ocorrência virtual
        });
      }
    });
    
    events = expandedEvents;
    
    console.log('Total de eventos (com recorrências):', events.length);
    renderCalendar();
  } catch (error) {
    console.error('Erro ao carregar eventos:', error);
    showNotification('Erro ao carregar eventos: ' + error.message, 'error');
    renderCalendar();
  }
}

function renderEventsList() {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) return;
  
  eventsList.innerHTML = '';

  // Filter events for the currently selected month and year in the calendar
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const monthEvents = events.filter(event => {
    const dateStr = event.data_evento.substring(0, 10);
    const eventDate = new Date(dateStr + 'T12:00:00');
    return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
  });

  if (monthEvents.length === 0) {
    eventsList.innerHTML = '<p style="text-align: center; color: #718096; font-style: italic;">Nenhum evento para este mês.</p>';
    return;
  }

  const now = new Date();

  // Agrupar eventos recorrentes por id_evento
  // Para cada id, contar quantas ocorrências tem no mês e pegar a próxima data
  const grouped = {};
  monthEvents.forEach(event => {
    const id = event.id_evento;
    if (!grouped[id]) {
      grouped[id] = {
        event: event,
        count: 1,
        dates: [event.data_evento.substring(0, 10)]
      };
    } else {
      grouped[id].count++;
      grouped[id].dates.push(event.data_evento.substring(0, 10));
    }
  });

  // Converter para array e ordenar: ativos primeiro, passados no final
  const groupedArray = Object.values(grouped);
  groupedArray.sort((a, b) => {
    const dateStrA = a.dates[0];
    const dateA = new Date(`${dateStrA}T${a.event.hora_evento || '00:00'}`);
    const isPastA = dateA < now;

    const dateStrB = b.dates[0];
    const dateB = new Date(`${dateStrB}T${b.event.hora_evento || '00:00'}`);
    const isPastB = dateB < now;

    if (isPastA && !isPastB) return 1;
    if (!isPastA && isPastB) return -1;
    return dateA - dateB;
  });

  groupedArray.forEach(group => {
    const event = group.event;
    const eventDiv = document.createElement('div');
    eventDiv.className = 'event-item';
    eventDiv.style.setProperty('--event-color', event.cor || '#3b82f6');
    
    // Verifica se a próxima ocorrência já passou
    const nextDate = group.dates.find(d => new Date(`${d}T${event.hora_evento || '00:00'}`) >= now) || group.dates[0];
    const eventDateTime = new Date(`${nextDate}T${event.hora_evento || '00:00'}`);
    if (eventDateTime < now) {
      eventDiv.classList.add('past-event');
    }

    const dataFormatada = formatDate(nextDate);
    
    // Badge de repetição
    const repeticaoLabels = { 'semanal': 'Semanal', 'mensal': 'Mensal', 'anual': 'Anual' };
    const rep = event.repeticao;
    const repeatBadge = (rep && rep !== 'nenhuma' && group.count > 1)
      ? `<div style="margin-top: 6px; display: inline-flex; align-items: center; background: rgba(139, 92, 246, 0.2); color: #a78bfa; font-size: 0.75rem; font-weight: 700; padding: 3px 10px; border-radius: 6px;"><i data-lucide="repeat" class="icon-inline" style="width: 12px; height: 12px; stroke-width: 2.5; margin-right: 4px;"></i>${repeticaoLabels[rep] || rep} · ${group.count}x neste mês</div>`
      : '';
    
    const urgenciaBadge = event.urgencia === 'urgente'
      ? `<i data-lucide="alert-triangle" class="icon-inline" style="width: 14px; height: 14px; stroke-width: 2.5; color: #ef4444; margin-right: 4px; vertical-align: middle;"></i>URGENTE`
      : `<i data-lucide="pin" class="icon-inline" style="width: 14px; height: 14px; stroke-width: 2.5; color: #10b981; margin-right: 4px; vertical-align: middle;"></i>NORMAL`;

    eventDiv.innerHTML = `
      <span class="event-time">${dataFormatada} às ${event.hora_evento}</span>
      <h3>${event.titulo}</h3>
      <p>${event.descricao || 'Sem descrição'}</p>
      ${repeatBadge}
      <div style="margin-top: 10px; font-size: 0.8rem; font-weight: 700; color: ${event.urgencia === 'urgente' ? '#ef4444' : '#10b981'}; display: flex; align-items: center;">
        ${urgenciaBadge}
      </div>
    `;
    eventsList.appendChild(eventDiv);
  });

  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

// Formatar data
function formatDate(dateString) {
  const dateStr = dateString.substring(0, 10);
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR');
}

// Notificações
function showNotification(message, type = 'info') {
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(notification => {
    if (notification.parentNode) {
      document.body.removeChild(notification);
    }
  });

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

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
