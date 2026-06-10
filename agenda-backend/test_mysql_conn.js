const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: ''
});

conn.connect((err) => {
  if (err) {
    console.error('Erro com senha vazia:', err);
    
    // Tentar sem a chave password
    const conn2 = mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });
    
    conn2.connect((err2) => {
      if (err2) {
        console.error('Erro sem chave password:', err2);
      } else {
        console.log('Conectou com sucesso sem chave password! 🎉');
        conn2.end();
      }
    });
  } else {
    console.log('Conectou com sucesso com senha vazia! 🎉');
    conn.end();
  }
});
