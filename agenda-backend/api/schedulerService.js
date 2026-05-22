const db = require('../config/db');
const { sendEventEmail, sendEventAlertEmail } = require('./emailService');

const getSaoPauloDate = (date = new Date()) => {
    // Converte a data para a string correspondente no fuso horário de SP
    const spString = date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' });
    return new Date(spString);
};

const isEventDueToday = (event, todayInSP) => {
    const todayYear = todayInSP.getFullYear();
    const todayMonth = todayInSP.getMonth(); // 0-11
    const todayDate = todayInSP.getDate(); // 1-31
    const todayDay = todayInSP.getDay(); // 0-6 (dia da semana)
    
    // event.data_evento é uma string "YYYY-MM-DD"
    const [evYear, evMonth, evDate] = event.data_evento.split('-').map(Number);
    
    // Comparação de timestamps para garantir que o evento já iniciou ou inicia hoje
    const evCompare = new Date(evYear, evMonth - 1, evDate).getTime();
    const todayCompare = new Date(todayYear, todayMonth, todayDate).getTime();
    
    if (evCompare > todayCompare) {
        // Evento no futuro, não iniciou ainda
        return false;
    }
    
    if (event.repeticao === 'nenhuma') {
        return evCompare === todayCompare;
    }
    
    if (event.repeticao === 'diaria') {
        return true;
    }
    
    if (event.repeticao === 'semanal') {
        const evDay = new Date(evYear, evMonth - 1, evDate).getDay();
        return evDay === todayDay;
    }
    
    if (event.repeticao === 'mensal') {
        return evDate === todayDate;
    }
    
    if (event.repeticao === 'anual') {
        return evDate === todayDate && (evMonth - 1) === todayMonth;
    }
    
    return false;
};

const checkAndSendEmails = () => {
    if (!db.isInitialized) {
        console.log('[Scheduler] Banco de dados ainda não inicializado. Pulando verificação por enquanto...');
        return;
    }
    
    // now ajustado para o fuso horário de SP (UTC-3)
    const now = getSaoPauloDate();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`[Scheduler] Verificando compromissos para o horário (SP): ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);

    // Buscar todos os eventos cadastrados formatando a data de evento como string YYYY-MM-DD
    db.query(
        `SELECT e.id_evento, e.titulo, e.descricao, e.data_evento, 
                e.hora_evento, e.id_usuario, e.urgencia, e.cor, e.repeticao, e.alerta_minutos, 
                e.ultimo_alerta_enviado, e.ultimo_inicio_enviado, u.email 
         FROM eventos e 
         JOIN usuarios u ON e.id_usuario = u.id_usuario`,
        async (err, results) => {
            if (err) {
                console.error('[Scheduler] Erro ao buscar eventos do banco:', err);
                return;
            }

            for (const event of results) {
                // Checa se o evento é devido hoje
                if (isEventDueToday(event, now)) {
                    // hora_evento vem como string "17:30:00"
                    const [eventHour, eventMinute] = event.hora_evento.split(':').map(Number);
                    
                    // Criar data de ocorrência hoje no timezone do sistema (usando os componentes de SP) para cálculo preciso
                    const eventTimeToday = new Date(
                        now.getFullYear(),
                        now.getMonth(),
                        now.getDate(),
                        eventHour,
                        eventMinute,
                        0,
                        0
                    );
                    
                    const diffMs = eventTimeToday.getTime() - now.getTime();
                    const diffMin = Math.round(diffMs / 60000);
                    
                    // Se houver FRONTEND_URL configurada no Render, usa ela. Senão, fallback para localhost.
                    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8082';
                    const link = `${baseUrl}/dashboard.html`;
                    
                    // Formatar data em padrão brasileiro para ficar profissional e legível (DD/MM/YYYY)
                    const [yr, mo, dy] = event.data_evento.split('-');
                    const formattedDate = `${dy}/${mo}/${yr}`;
                    const formattedTime = event.hora_evento.substring(0, 5);
                    const formattedDateTime = `${formattedDate} às ${formattedTime}`;

                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                    // 1. DISPARO DE INÍCIO DO COMPROMISSO (com janela de tolerância de 5 minutos)
                    if (diffMin <= 0 && diffMin >= -5 && event.ultimo_inicio_enviado !== todayStr) {
                        console.log(`[Scheduler] Disparando e-mail de Início para o evento "${event.titulo}" (${event.urgencia}) de ${event.email}`);
                        const isUrgente = (event.urgencia === 'urgente');
                        
                        db.query('UPDATE eventos SET ultimo_inicio_enviado = ? WHERE id_evento = ?', [todayStr, event.id_evento], (err) => {
                            if (err) {
                                console.error(`[Scheduler] Erro ao marcar envio de início no DB para o evento ${event.id_evento}:`, err);
                                return;
                            }
                            sendEventEmail(event.email, event.titulo, formattedDateTime, link, isUrgente)
                                .catch(err => console.error(`[Scheduler] Falha ao enviar e-mail de início do evento ${event.id_evento}:`, err));
                        });
                    }
                    
                    // 2. DISPARO DO ALERTA ANTECIPADO (com janela de tolerância de 5 minutos)
                    else if (event.alerta_minutos > 0 && diffMin <= event.alerta_minutos && diffMin >= (event.alerta_minutos - 5) && event.ultimo_alerta_enviado !== todayStr) {
                        console.log(`[Scheduler] Disparando e-mail de Alerta (${event.alerta_minutos} min antes) para o evento "${event.titulo}" de ${event.email}`);
                        const isUrgente = (event.urgencia === 'urgente');
                        
                        db.query('UPDATE eventos SET ultimo_alerta_enviado = ? WHERE id_evento = ?', [todayStr, event.id_evento], (err) => {
                            if (err) {
                                console.error(`[Scheduler] Erro ao marcar envio de alerta no DB para o evento ${event.id_evento}:`, err);
                                return;
                            }
                            sendEventAlertEmail(event.email, event.titulo, formattedDateTime, link, event.alerta_minutos, isUrgente)
                                .catch(err => console.error(`[Scheduler] Falha ao enviar e-mail de alerta do evento ${event.id_evento}:`, err));
                        });
                    }
                }
            }
        }
    );
};

const startScheduler = () => {
    console.log('[Scheduler] Serviço de agendamento de e-mails iniciado ⏰');
    
    // Executa a primeira vez ao iniciar
    checkAndSendEmails();
    
    // Executa a cada 60 segundos
    setInterval(checkAndSendEmails, 60000);
};

module.exports = { startScheduler };
