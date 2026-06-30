const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  console.log('Iniciando limpeza e população do Banco de Dados para Testes...');

  // 1. Desativar chaves estrangeiras
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 0', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  // 2. Limpar todas as tabelas
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
    await new Promise((resolve) => {
      db.query(`DELETE FROM ${table}`, err => {
        if (err) {
          console.warn(`Aviso: não foi possível limpar tabela ${table}:`, err.message);
        } else {
          console.log(`Tabela ${table} limpa.`);
        }
        resolve();
      });
    });
  }

  // 3. Re-ativar chaves estrangeiras
  await new Promise((resolve, reject) => {
    db.query('SET FOREIGN_KEY_CHECKS = 1', err => {
      if (err) return reject(err);
      resolve();
    });
  });

  // 4. Criar Admin User
  const nome = 'Administrador Teste';
  const email = 'admin@agenda.com';
  const senhaPlana = 'admin123';
  const senhaHash = await bcrypt.hash(senhaPlana, 10);
  const role = 'admin';
  const verificado = 1;

  await new Promise((resolve, reject) => {
    db.query(
      `INSERT INTO usuarios (nome, email, senha, verificado, role) VALUES (?, ?, ?, ?, ?)`,
      [nome, email, senhaHash, verificado, role],
      (err, result) => {
        if (err) {
          console.error('Erro ao cadastrar administrador:', err);
          return reject(err);
        }
        console.log(`Administrador cadastrado: ${email} com senha: ${senhaPlana}`);
        resolve(result);
      }
    );
  });

  console.log('Seeding concluído com sucesso!');
  process.exit(0);
}

// Aguarda inicialização das tabelas se necessário
setTimeout(() => {
  seedAdmin().catch(err => {
    console.error('Erro no seed:', err);
    process.exit(1);
  });
}, 2000);
