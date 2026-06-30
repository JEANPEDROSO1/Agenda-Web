// reset-db.js – wipe all data safely
// Run with: node reset-db.js

const db = require('./config/db');

async function resetDatabase() {
  console.log('Iniciando limpeza total do Banco de Dados...');

  // Desativar verificação de chaves estrangeiras
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 0', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  const tables = [
    'grupo_eventos',
    'grupo_participantes',
    'grupos',
    'perfis',
    'refresh_tokens',
    'recuperacao_senha',
    'eventos',
    'usuarios'
  ];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.query(`DELETE FROM ${table}`, err => {
        if (err) {
          // Ignorar se a tabela não existir ainda
          console.warn(`Aviso: não foi possível limpar tabela ${table}:`, err.message);
        } else {
          console.log(`Tabela ${table} limpa.`);
        }
        resolve();
      });
    });
  }

  // Re-ativar chaves estrangeiras
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 1', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  console.log('Reset do banco de dados concluído com sucesso!');
  process.exit(0);
}

resetDatabase().catch(err => {
  console.error('Erro ao resetar o banco de dados:', err);
  process.exit(1);
});
