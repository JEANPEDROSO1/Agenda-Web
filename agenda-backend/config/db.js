const path = require('path');

console.log('=== DIAGNÓSTICO DO BANCO DE DADOS (ABSOLUTO TOP) ===');
console.log('DATABASE_URL no OS:', typeof process.env.DATABASE_URL, process.env.DATABASE_URL ? `definida (tamanho: ${process.env.DATABASE_URL.length})` : 'vazia/indefinida');
if (process.env.DATABASE_URL) {
  const match = process.env.DATABASE_URL.match(/@([^:/]+)/);
  if (match) {
    console.log('DATABASE_URL Host no OS:', match[1]);
  }
}
console.log('==================================================');

// Apenas carrega o dotenv se a variável não estiver definida no sistema operacional (ex: localmente)
if (!process.env.DATABASE_URL) {
  console.log('[db] DATABASE_URL não está no OS. Carregando dotenv...');
  require('dotenv').config();
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });
} else {
  console.log('[db] DATABASE_URL já está ativa no OS. Ignorando dotenv para evitar conflito.');
}

const mysql = require('mysql2');

console.log('--- Configuração do Banco de Dados ---');
console.log('DATABASE_URL presente:', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL length:', process.env.DATABASE_URL.length);
  const match = process.env.DATABASE_URL.match(/@([^:/]+)/);
  if (match) {
    console.log('DATABASE_URL Host ativo:', match[1]);
  }
} else {
  console.log('DB_HOST:', process.env.DB_HOST || 'localhost');
  console.log('DB_PORT:', process.env.DB_PORT || 3306);
  console.log('DB_USER:', process.env.DB_USER || 'root');
  console.log('DB_NAME:', process.env.DB_NAME || 'agenda_web');
}
console.log('--------------------------------------');

const connection = process.env.DATABASE_URL
  ? mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    })
  : mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'agenda_web',
      port: process.env.DB_PORT || 3306,
      ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') ? { rejectUnauthorized: false } : undefined
    });

connection.connect((err) => {
  if (err) {
    console.error('Erro ao conectar:', err);
  } else {
    console.log('Conectado ao MySQL 🚀');

    // Garantir que a tabela usuarios exista antes de criar eventos
    connection.query(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL
      )`,
      (err) => {
        if (err) {
          console.error('Erro ao criar/atualizar tabela usuarios:', err);
        }
      }
    );

    // Garantir que a tabela eventos tenha as colunas urgencia e cor
    connection.query(
      `CREATE TABLE IF NOT EXISTS eventos (
        id_evento INT AUTO_INCREMENT PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        descricao TEXT,
        data_evento DATE NOT NULL,
        hora_evento TIME NOT NULL,
        id_usuario INT NOT NULL,
        urgencia VARCHAR(20) NOT NULL DEFAULT 'normal',
        cor VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
      )`,
      (err) => {
        if (err) {
          console.error('Erro ao criar/atualizar tabela eventos:', err);
        }
      }
    );

    const ensureColumn = (table, column, definition) => {
      connection.query(
        'SHOW COLUMNS FROM ' + table + ' LIKE ?',
        [column],
        (err, results) => {
          if (err) {
            console.error(`Erro ao verificar coluna ${column} em ${table}:`, err);
            return;
          }
          if (results.length === 0) {
            connection.query(
              `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`,
              (err) => {
                if (err) {
                  console.error(`Erro ao adicionar coluna ${column} em ${table}:`, err);
                }
              }
            );
          }
        }
      );
    };

    ensureColumn('eventos', 'urgencia', "VARCHAR(20) NOT NULL DEFAULT 'normal'");
    ensureColumn('eventos', 'cor', "VARCHAR(7) NOT NULL DEFAULT '#3b82f6'");
    ensureColumn('eventos', 'repeticao', "VARCHAR(20) NOT NULL DEFAULT 'nenhuma'");
    ensureColumn('eventos', 'alerta_minutos', "INT NOT NULL DEFAULT 0");
    ensureColumn('eventos', 'ultimo_alerta_enviado', "VARCHAR(10) DEFAULT NULL");
    ensureColumn('eventos', 'ultimo_inicio_enviado', "VARCHAR(10) DEFAULT NULL");
  }
});

module.exports = connection;