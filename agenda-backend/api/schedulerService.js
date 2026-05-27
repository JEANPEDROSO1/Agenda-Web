const db = require('../config/db');
const { sendEventEmail, sendEventAlertEmail } = require('./emailService');
process.env.TZ = 'America/Sao_Paulo';

const getSaoPauloDate = () => new Date();

const isEventDueToday = (event, todayInSP) => {
    try {
        const todayYear = todayInSP.getFullYear();
        const todayMonth = todayInSP.getMonth(); // 0-11
        const todayDate = todayInSP.getDate(); // 1-31
        const todayDay = todayInSP.getDay(); // 0-6 (dia da semana)
        
        let evYear, evMonth, evDate;
        
        if (event.data_evento instanceof Date) {
            evYear = event.data_evento.getFullYear();
            evMonth = event.data_evento.getMonth() + 1; // getMonth() é 0-11
            evDate = event.data_evento.getDate();
        } else if (typeof event.data_evento === 'string') {
            const datePart = event.data_evento.includes('T') ? event.data_evento.split('T')[0] : event.data_evento;
            const parts = datePart.split('-');
            if (parts.length === 3) {
                [evYear, evMonth, evDate] = parts.map(Number);
            } else {
                console.error('[Scheduler] Formato de data inválido:', event.data_evento);
                return false;
            }
        } else {
            console.error('[Scheduler] Tipo de data inválido/ausente:', typeof event.data_evento);
            return false;
        }
        
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
    } catch (e) {
        console.error('[Scheduler] Erro em isEventDueToday:', e);
        return false;
    }
};

const checkAndSendEmails = () => {
    try {
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
                    e.ultimo_alerta_enviado, e.ultimo_inicio_enviado, u.email, u.nome 
             FROM eventos e 
             JOIN usuarios u ON e.id_usuario = u.id_usuario`,
            async (err, results) => {
                if (err) {
                    console.error('[Scheduler] Erro ao buscar eventos do banco:', err);
                    return;
                }

                try {
                    for (const event of results) {
                        // Evitar campos nulos ou indefinidos
                        if (!event.data_evento || !event.hora_evento || !event.email) {
                            console.warn(`[Scheduler] Evento ${event.id_evento || 'desconhecido'} pulado devido a campos nulos: data_evento=${event.data_evento}, hora_evento=${event.hora_evento}, email=${event.email}`);
                            continue;
                        }

                        // Checa se o evento é devido hoje
                        if (isEventDueToday(event, now)) {
                            // hora_evento vem como string "17:30:00" ou objeto Date
                            let eventHour, eventMinute;
                            if (typeof event.hora_evento === 'string') {
                                const parts = event.hora_evento.split(':');
                                eventHour = Number(parts[0]);
                                eventMinute = Number(parts[1]);
                            } else if (event.hora_evento instanceof Date) {
                                eventHour = event.hora_evento.getHours();
                                eventMinute = event.hora_evento.getMinutes();
                            } else {
                                console.error('[Scheduler] Formato de hora inválido para o evento:', event.id_evento);
                                continue;
                            }
                            
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
                            
                            // Link de acesso ao site conforme especificado pelo usuário
                            const link = 'https://agendaweb360.vercel.app';
                            
                            // Formatar data em padrão brasileiro para ficar profissional e legível (DD/MM/YYYY)
                            let formattedDate = '';
                            if (event.data_evento instanceof Date) {
                                const dy = String(event.data_evento.getDate()).padStart(2, '0');
                                const mo = String(event.data_evento.getMonth() + 1).padStart(2, '0');
                                const yr = event.data_evento.getFullYear();
                                formattedDate = `${dy}/${mo}/${yr}`;
                            } else if (typeof event.data_evento === 'string') {
                                const datePart = event.data_evento.includes('T') ? event.data_evento.split('T')[0] : event.data_evento;
                                const [yr, mo, dy] = datePart.split('-');
                                formattedDate = `${dy}/${mo}/${yr}`;
                            }

                            const formattedTime = `${String(eventHour).padStart(2, '0')}:${String(eventMinute).padStart(2, '0')}`;
                            const formattedDateTime = `${formattedDate} às ${formattedTime}`;

                            const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

                            // 1. DISPARO DE INÍCIO DO COMPROMISSO (com janela de tolerância de 5 minutos)
                            if (diffMin <= 0 && diffMin >= -5 && event.ultimo_inicio_enviado !== todayStr) {
                                console.log(`[Scheduler] Disparando e-mail de Início para o evento "${event.titulo}" (${event.urgencia}) de ${event.email}`);
                                
                                db.query('UPDATE eventos SET ultimo_inicio_enviado = ? WHERE id_evento = ?', [todayStr, event.id_evento], (err) => {
                                    if (err) {
                                        console.error(`[Scheduler] Erro ao marcar envio de início no DB para o evento ${event.id_evento}:`, err);
                                        return;
                                    }
                                    sendEventEmail(event.email, event.nome, event.titulo, formattedDateTime, link)
                                        .catch(err => console.error(`[Scheduler] Falha ao enviar e-mail de início do evento ${event.id_evento}:`, err));
                                });
                            }
                            
                            // 2. DISPARO DO ALERTA ANTECIPADO (com janela de tolerância de 5 minutos)
                            else if (event.alerta_minutos > 0 && diffMin <= event.alerta_minutos && diffMin >= (event.alerta_minutos - 5) && event.ultimo_alerta_enviado !== todayStr) {
                                console.log(`[Scheduler] Disparando e-mail de Alerta (${event.alerta_minutos} min antes) para o evento "${event.titulo}" de ${event.email}`);
                                
                                db.query('UPDATE eventos SET ultimo_alerta_enviado = ? WHERE id_evento = ?', [todayStr, event.id_evento], (err) => {
                                    if (err) {
                                        console.error(`[Scheduler] Erro ao marcar envio de alerta no DB para o evento ${event.id_evento}:`, err);
                                        return;
                                    }
                                    sendEventAlertEmail(event.email, event.nome, event.titulo, formattedDateTime, link, event.alerta_minutos)
                                        .catch(err => console.error(`[Scheduler] Falha ao enviar e-mail de alerta do evento ${event.id_evento}:`, err));
                                });
                            }
                        }
                    }
                } catch (loopErr) {
                    console.error('[Scheduler] Erro durante o processamento dos eventos:', loopErr);
                }
            }
        );
    } catch (err) {
        console.error('[Scheduler] Erro geral no checkAndSendEmails:', err);
    }
};

const startScheduler = () => {
    console.log('[Scheduler] Serviço de agendamento de e-mails iniciado ⏰');
    
    // Espera o banco de dados inicializar antes de começar a verificação
    const checkDbReady = setInterval(() => {
        if (db.isInitialized) {
            clearInterval(checkDbReady);
            console.log('[Scheduler] Banco de dados pronto. Iniciando verificações periódicas...');
            checkAndSendEmails(); // Executa a primeira vez imediatamente
            setInterval(checkAndSendEmails, 60000); // Executa a cada 60 segundos
        }
    }, 1000);
};

module.exports = { startScheduler, checkAndSendEmails };
