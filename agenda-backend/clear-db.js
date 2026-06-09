// clear-db.js – removes all rows from the 'eventos' and 'usuarios' tables
// Use with caution: this will delete every user account and appointment.

const db = require('./config/db');

function clearDatabase() {
  return new Promise((resolve, reject) => {
    // Delete eventos first to avoid foreign key constraints, though CASCADE helps
    db.query('DELETE FROM eventos', (err) => {
      if (err) {
        console.error('Erro ao excluir eventos:', err);
        return reject(err);
      }
      console.log('Todos os eventos (compromissos) foram excluídos com sucesso.');
      
      db.query('DELETE FROM usuarios', (err2) => {
        if (err2) {
          console.error('Erro ao excluir contas de usuário:', err2);
          return reject(err2);
        }
        console.log('Todas as contas de usuário foram excluídas com sucesso.');
        resolve();
      });
    });
  });
}

// Execute when run directly
if (require.main === module) {
  clearDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
