const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

conn.connect((err) => {
  if (err) {
    console.error('Erro ao conectar para criar o banco:', err);
    process.exit(1);
  }
  conn.query('CREATE DATABASE IF NOT EXISTS agenda_web', (err2) => {
    if (err2) {
      console.error('Erro ao executar query de criação:', err2);
      process.exit(1);
    }
    console.log('Banco de dados agenda_web verificado/criado com sucesso! 🎉');
    conn.end();
  });
});
