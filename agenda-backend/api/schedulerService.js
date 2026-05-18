const db = require('../config/db');
const { sendEventEmail, sendEventAlertEmail } = require('./emailService');

const isEventDueToday = (event, today) => {
    // today é um objeto Date em horário local
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth(); // 0-11
    const todayDate = today.getDate(); // 1-31
    const todayDay = today.getDay(); // 0-6 (dia da semana)
    
    // event.data_evento retornado do MySQL2 é um Date
    const eDate = new Date(event.data_evento);
    const evYear = eDate.getFullYear();
    const evMonth = eDate.getMonth();
    const evDate = eDate.getDate();
    const evDay = eDate.getDay();
    
    // Comparação de timestamps para garantir que o evento já iniciou ou inicia hoje
    const evCompare = new Date(evYear, evMonth, evDate).getTime();
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
        return evDay === todayDay;
    }
    
    if (event.repeticao === 'mensal') {
        return evDate === todayDate;
    }
    
    if (event.repeticao === 'anual') {
        return evDate === todayDate && evMonth === todayMonth;
    }
    
    return false;
};

const checkAndSendEmails = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`[Scheduler] Verificando compromissos para o horário: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);

    // Buscar todos os eventos cadastrados
    db.query(
        `SELECT e.*, u.email 
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
                    
                    // Criar data de ocorrência hoje para cálculo matemático preciso de minutos
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
                    
                    const link = `http://localhost:8082/dashboard.html`; // link da aplicação
                    
                    // Formatar data em padrão brasileiro para ficar profissional e legível
                    const formattedDate = new Date(event.data_evento).toLocaleDateString('pt-BR');
                    const formattedTime = event.hora_evento.substring(0, 5);
                    const formattedDateTime = `${formattedDate} às ${formattedTime}`;

                    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                    // 1. DISPARO NO MINUTO EXATO (0 minutos de diferença)
                    if (diffMin === 0 && event.ultimo_inicio_enviado !== todayStr) {
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
                    
                    // 2. DISPARO DO ALERTA ANTECIPADO (Exatamente alerta_minutos de diferença antes de iniciar)
                    else if (event.alerta_minutos > 0 && diffMin === event.alerta_minutos && event.ultimo_alerta_enviado !== todayStr) {
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
