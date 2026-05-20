const db = require('./config/db');

setTimeout(() => {
    if (!db.isInitialized) {
        console.log('Aguardando inicialização do banco...');
    }
    
    const id_usuario = 2; // Teste com id_usuario = 2
    
    // Consultar eventos usando a mesma query do eventController
    db.query(
        'SELECT id_evento, titulo, descricao, DATE_FORMAT(data_evento, "%Y-%m-%d") as data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos FROM eventos WHERE id_usuario = ?',
        [id_usuario],
        (err, results) => {
            if (err) {
                console.error('Erro na query formatada:', err);
                process.exit(1);
            }
            console.log('=== RESULTADOS DA QUERY FORMATADA ===');
            console.log(JSON.stringify(results, null, 2));
            console.log('======================================');
            process.exit(0);
        }
    );
}, 2000);
