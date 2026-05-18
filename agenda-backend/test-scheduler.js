require('dotenv').config();
const db = require('./config/db');

const isEventDueToday = (event, today) => {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const todayDay = today.getDay();
    
    const eDate = new Date(event.data_evento);
    const evYear = eDate.getFullYear();
    const evMonth = eDate.getMonth();
    const evDate = eDate.getDate();
    const evDay = eDate.getDay();
    
    const evCompare = new Date(evYear, evMonth, evDate).getTime();
    const todayCompare = new Date(todayYear, todayMonth, todayDate).getTime();
    
    console.log(`[Diagnostic] Evento "${event.titulo}":`);
    console.log(`  - Data do evento no DB:`, event.data_evento);
    console.log(`  - Objeto JS Date convertido:`, eDate.toString());
    console.log(`  - Componentes Local: Ano=${evYear}, Mês=${evMonth}, Dia=${evDate}, DiaSemana=${evDay}`);
    console.log(`  - Hoje Local: Ano=${todayYear}, Mês=${todayMonth}, Dia=${todayDate}, DiaSemana=${todayDay}`);
    console.log(`  - evCompare = ${evCompare}, todayCompare = ${todayCompare}`);
    
    if (evCompare > todayCompare) {
        console.log(`  -> REJEITADO: Evento no futuro (começa em ${evYear}-${evMonth+1}-${evDate}, hoje é ${todayYear}-${todayMonth+1}-${todayDate})`);
        return false;
    }
    
    let due = false;
    if (event.repeticao === 'nenhuma') {
        due = evCompare === todayCompare;
        console.log(`  -> Repetição NENHUMA: ${due ? 'Bate hoje!' : 'Não bate hoje'}`);
    } else if (event.repeticao === 'diaria') {
        due = true;
        console.log(`  -> Repetição DIÁRIA: Bate hoje!`);
    } else if (event.repeticao === 'semanal') {
        due = evDay === todayDay;
        console.log(`  -> Repetição SEMANAL: ${due ? 'Dia de semana bate!' : 'Dia de semana não bate'}`);
    } else if (event.repeticao === 'mensal') {
        due = evDate === todayDate;
        console.log(`  -> Repetição MENSAL: ${due ? 'Dia do mês bate!' : 'Dia do mês não bate'}`);
    } else if (event.repeticao === 'anual') {
        due = evDate === todayDate && evMonth === todayMonth;
        console.log(`  -> Repetição ANUAL: ${due ? 'Mês e dia batem!' : 'Mês e dia não batem'}`);
    }
    
    return due;
};

const runDiagnostic = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log("=== INICIANDO DIAGNÓSTICO DE AGENDAMENTO ===");
    console.log("Data/Hora atual local do JS:", now.toString());
    console.log(`Hora procurada: ${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`);
    
    db.query(
        `SELECT e.*, u.email 
         FROM eventos e 
         JOIN usuarios u ON e.id_usuario = u.id_usuario`,
        async (err, results) => {
            if (err) {
                console.error("Erro no banco:", err);
                process.exit(1);
            }
            
            console.log(`Total de eventos encontrados no banco: ${results.length}`);
            
            for (const event of results) {
                const isDue = isEventDueToday(event, now);
                const [eventHour, eventMinute] = event.hora_evento.split(':').map(Number);
                
                console.log(`  - Hora do evento no DB: ${event.hora_evento} (Parsed: ${eventHour}:${eventMinute})`);
                console.log(`  - Hora Atual: ${currentHour}:${currentMinute}`);
                
                const hourMatch = eventHour === currentHour;
                const minuteMatch = eventMinute === currentMinute;
                
                console.log(`  - Bate Data? ${isDue}`);
                console.log(`  - Bate Hora? ${hourMatch} (Evento: ${eventHour}, Atual: ${currentHour})`);
                console.log(`  - Bate Minuto? ${minuteMatch} (Evento: ${eventMinute}, Atual: ${currentMinute})`);
                
                if (isDue && hourMatch && minuteMatch) {
                    console.log(`  🎉 ESTE EVENTO DEVERIA ENVIAR EMAIL AGORA!`);
                } else {
                    console.log(`  ❌ Não envia agora.`);
                }
                console.log("-----------------------------------------");
            }
            db.end();
            console.log("Diagnóstico finalizado.");
        }
    );
};

runDiagnostic();
