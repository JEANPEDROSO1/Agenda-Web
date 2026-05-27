// clear-db.js – removes all rows from the 'usuarios' table
// Use with caution: this will delete every user account.

const db = require('./config/db');

function clearUsers() {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM usuarios', (err) => {
      if (err) {
        console.error('Erro ao excluir contas:', err);
        return reject(err);
      }
      console.log('Todas as contas de usuário foram excluídas com sucesso.');
      resolve();
    });
  });
}

// Execute when run directly
if (require.main === module) {
  clearUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
