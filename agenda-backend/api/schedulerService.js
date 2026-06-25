const db = require('../config/db');
const { sendEventEmail, sendEventAlertEmail } = require('./emailService');
process.env.TZ = 'America/Sao_Paulo';

const getSaoPauloDate = () => new Date();

let isSchedulerRunning = false;

const isEventDueToday = (event, todayInSP) => {
    try {
        const todayYear = todayInSP.getFullYear();
        const todayMonth = todayInSP.getMonth();
        const todayDate = todayInSP.getDate();
        const todayDay = todayInSP.getDay();
        
        let evYear, evMonth, evDate;
        
        if (event.data_evento instanceof Date) {
            evYear = event.data_evento.getFullYear();
            evMonth = event.data_evento.getMonth() + 1;
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
        
        const evCompare = new Date(evYear, evMonth - 1, evDate).getTime();
        const todayCompare = new Date(todayYear, todayMonth, todayDate).getTime();
        
        if (evCompare > todayCompare) return false;
        
        if (event.repeticao === 'nenhuma') return evCompare === todayCompare;
        if (event.repeticao === 'diaria') return true;
        if (event.repeticao === 'semanal') {
            const evDay = new Date(evYear, evMonth - 1, evDate).getDay();
            return evDay === todayDay;
        }
        if (event.repeticao === 'mensal') return evDate === todayDate;
        if (event.repeticao === 'anual') return evDate === todayDate && (evMonth - 1) === todayMonth;
        
        return false;
    } catch (e) {
        console.error('[Scheduler] Erro em isEventDueToday:', e);
        return false;
    }
};

const processEventResults = (results, now, tableName, idColumnName) => {
    return new Promise((resolve) => {
        if (!results || results.length === 0) return resolve();
        
        const promises = [];
        
        for (const event of results) {
            if (!event.data_evento || !event.hora_evento || !event.email) continue;

            if (isEventDueToday(event, now)) {
                let eventHour, eventMinute;
                if (typeof event.hora_evento === 'string') {
                    const parts = event.hora_evento.split(':');
                    eventHour = Number(parts[0]);
                    eventMinute = Number(parts[1]);
                } else if (event.hora_evento instanceof Date) {
                    eventHour = event.hora_evento.getHours();
                    eventMinute = event.hora_evento.getMinutes();
                } else {
                    continue;
                }
                
                const eventTimeToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), eventHour, eventMinute, 0, 0);
                const diffMs = eventTimeToday.getTime() - now.getTime();
                const diffMin = Math.round(diffMs / 60000);
                const link = 'https://agendaweb360.vercel.app';
                
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
                const isUrgente = event.urgencia === 'urgente';

                // Disparo de Início
                if (diffMin <= 0 && diffMin >= -5 && event.ultimo_inicio_enviado !== todayStr) {
                    console.log(`[Scheduler] Disparando Início para "${event.titulo}" (${tableName}) -> ${event.email}`);
                    
                    const p = new Promise((res) => {
                        db.query(`UPDATE ${tableName} SET ultimo_inicio_enviado = ? WHERE ${idColumnName} = ?`, [todayStr, event.id_evento], (err) => {
                            if (err) {
                                console.error(`[Scheduler] Erro update inicio DB:`, err);
                                return res();
                            }
                            sendEventEmail(event.email, event.nome, event.titulo, formattedDateTime, link, isUrgente)
                                .then(() => res())
                                .catch((err) => {
                                    console.error(`[Scheduler] Erro sendEventEmail:`, err);
                                    res();
                                });
                        });
                    });
                    promises.push(p);
                }
                // Disparo Alerta
                else if (event.alerta_minutos > 0 && diffMin <= event.alerta_minutos && diffMin >= (event.alerta_minutos - 5) && event.ultimo_alerta_enviado !== todayStr) {
                    console.log(`[Scheduler] Disparando Alerta (${event.alerta_minutos}m) para "${event.titulo}" (${tableName}) -> ${event.email}`);
                    
                    const p = new Promise((res) => {
                        db.query(`UPDATE ${tableName} SET ultimo_alerta_enviado = ? WHERE ${idColumnName} = ?`, [todayStr, event.id_evento], (err) => {
                            if (err) {
                                console.error(`[Scheduler] Erro update alerta DB:`, err);
                                return res();
                            }
                            sendEventAlertEmail(event.email, event.nome, event.titulo, formattedDateTime, link, event.alerta_minutos, isUrgente)
                                .then(() => res())
                                .catch((err) => {
                                    console.error(`[Scheduler] Erro sendEventAlertEmail:`, err);
                                    res();
                                });
                        });
                    });
                    promises.push(p);
                }
            }
        }
        
        Promise.all(promises).then(() => resolve());
    });
};

const checkAndSendEmails = async () => {
    if (!db.isInitialized) return;
    if (isSchedulerRunning) {
        console.log('[Scheduler] Execução anterior ainda em andamento. Pulando este ciclo.');
        return;
    }
    
    isSchedulerRunning = true;
    try {
        const now = getSaoPauloDate();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentSecond = now.getSeconds();
        
        console.log(`[Scheduler] Verificando às ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}:${String(currentSecond).padStart(2, '0')}`);

        // 1. Processar eventos pessoais
        const personalEvents = await new Promise((resolve, reject) => {
            db.query(
                `SELECT e.id_evento, e.titulo, e.descricao, e.data_evento, 
                        e.hora_evento, e.id_usuario, e.urgencia, e.cor, e.repeticao, e.alerta_minutos, 
                        e.ultimo_alerta_enviado, e.ultimo_inicio_enviado, u.email, u.nome 
                 FROM eventos e 
                 JOIN usuarios u ON e.id_usuario = u.id_usuario`,
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        
        await processEventResults(personalEvents, now, 'eventos', 'id_evento');

        // 2. Processar eventos de grupo
        const groupEvents = await new Promise((resolve, reject) => {
            db.query(
                `SELECT ge.id_grupo_evento as id_evento, ge.titulo, ge.descricao, ge.data_evento, 
                        ge.hora_evento, ge.id_grupo, ge.urgencia, ge.cor, ge.repeticao, ge.alerta_minutos, 
                        ge.ultimo_alerta_enviado, ge.ultimo_inicio_enviado, u.email, u.nome
                 FROM grupo_eventos ge
                 JOIN grupo_participantes gp ON ge.id_grupo = gp.id_grupo
                 JOIN usuarios u ON gp.id_usuario = u.id_usuario`,
                (err, results) => {
                    if (err) reject(err);
                    else resolve(results);
                }
            );
        });
        
        await processEventResults(groupEvents, now, 'grupo_eventos', 'id_grupo_evento');
        
    } catch (err) {
        console.error('[Scheduler] Erro geral no checkAndSendEmails:', err);
    } finally {
        isSchedulerRunning = false;
    }
};

const startScheduler = () => {
    console.log('[Scheduler] Serviço iniciado (intervalo: 10s)');
    
    const checkDbReady = setInterval(() => {
        if (db.isInitialized) {
            clearInterval(checkDbReady);
            console.log('[Scheduler] Banco de dados pronto. Iniciando verificações periódicas...');
            checkAndSendEmails(); 
            setInterval(checkAndSendEmails, 10000); 
        }
    }, 1000);
};

module.exports = { startScheduler, checkAndSendEmails };
