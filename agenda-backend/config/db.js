require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'root',
  database: process.env.DB_NAME || 'agenda_web'
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