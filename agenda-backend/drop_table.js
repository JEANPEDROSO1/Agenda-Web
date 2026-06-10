const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'agenda_web'
});

conn.connect((err) => {
  if (err) {
    console.error('Erro ao conectar:', err);
    process.exit(1);
  }
  conn.query('DROP TABLE IF EXISTS eventos', (err2) => {
    if (err2) {
      console.error('Erro ao executar query de exclusão:', err2);
      process.exit(1);
    }
    console.log('Tabela eventos excluída com sucesso! 🎉');
    conn.end();
  });
});
