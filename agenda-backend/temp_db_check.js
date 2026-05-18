const mysql = require('mysql2');
const c = mysql.createConnection({ host: 'localhost', user: 'root', password: 'root', database: 'agenda_web' });

c.query('SHOW TABLES', (err, results) => {
  console.log('TABLES:', err || results.map(r => Object.values(r)[0]));
  c.query('SHOW COLUMNS FROM eventos', (err2, cols) => {
    console.log('EVENTOS COLUMNS:', err2 || cols.map(c => ({Field:c.Field,Type:c.Type,Null:c.Null,Key:c.Key}))); 
    c.query('SELECT id_usuario, nome, email FROM usuarios LIMIT 5', (err3, users) => {
      console.log('USERS:', err3 || users);
      c.end();
    });
  });
});
