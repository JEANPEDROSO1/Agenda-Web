const path = require('path');

// Limpar variáveis do OS que vieram como strings vazias, para que o dotenv ou o fallback possam funcionar
const envKeysToClean = ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'DB_PORT'];
envKeysToClean.forEach(key => {
  if (process.env[key] === '') {
    delete process.env[key];
  }
});

console.log('=== DIAGNÓSTICO DO BANCO DE DADOS (ABSOLUTO TOP) ===');
console.log('DATABASE_URL no OS tipo:', typeof process.env.DATABASE_URL);
console.log('DATABASE_URL no OS length:', process.env.DATABASE_URL ? process.env.DATABASE_URL.length : 0);
console.log('DATABASE_URL no OS valor:', process.env.DATABASE_URL ? `"${process.env.DATABASE_URL.substring(0, 5)}...${process.env.DATABASE_URL.substring(process.env.DATABASE_URL.length - 5)}"` : 'vazia/indefinida');

console.log('AZURE_CLIENT_ID no OS:', typeof process.env.AZURE_CLIENT_ID, process.env.AZURE_CLIENT_ID ? `tamanho: ${process.env.AZURE_CLIENT_ID.length}` : 'vazia');
console.log('EMAIL_USER no OS:', typeof process.env.EMAIL_USER, process.env.EMAIL_USER ? `tamanho: ${process.env.EMAIL_USER.length}` : 'vazia');
console.log('JWT_SECRET no OS:', typeof process.env.JWT_SECRET, process.env.JWT_SECRET ? `tamanho: ${process.env.JWT_SECRET.length}` : 'vazia');
console.log('==================================================');

// Apenas carrega o dotenv se a variável não estiver definida no sistema operacional (ex: localmente)
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
  console.log('[db] DATABASE_URL não está ativa no OS. Carregando dotenv...');
  require('dotenv').config();
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: path.join(__dirname, '../../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });

  // Limpar novamente caso os arquivos dotenv tenham injetado strings vazias
  envKeysToClean.forEach(key => {
    if (process.env[key] === '') {
      delete process.env[key];
    }
  });
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

const pool = process.env.DATABASE_URL
  ? mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    })
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || 'root',
      database: process.env.DB_NAME || 'agenda_web',
      port: process.env.DB_PORT || 3306,
      ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      dateStrings: true
    });

pool.getConnection((err, connection) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados via Pool:', err);
  } else {
    console.log('Conectado ao MySQL via Pool 🚀');
    connection.release();

    // 1. Criar tabela usuarios se não existir
    pool.query(
      `CREATE TABLE IF NOT EXISTS usuarios (
        id_usuario INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL
      )`,
      (err) => {
        if (err) {
          console.error('Erro ao criar/atualizar tabela usuarios:', err);
          return;
        }

        // Garantir colunas de verificação na tabela usuarios
        const userCols = [
          { name: 'codigo_verificacao', def: "VARCHAR(6) DEFAULT NULL" },
          { name: 'verificado', def: "TINYINT(1) NOT NULL DEFAULT 0" }
        ];
        let pendingUser = userCols.length;
        const checkUserDone = () => {
          pendingUser--;
          if (pendingUser === 0) {
            console.log('Colunas de verificação de usuários garantidas.');
          }
        };
        userCols.forEach(col => {
          pool.query('SHOW COLUMNS FROM usuarios LIKE ?', [col.name], (err, results) => {
            if (err) {
              console.error(`Erro ao verificar coluna ${col.name} na tabela usuarios:`, err);
              return checkUserDone();
            }
            if (results.length === 0) {
              pool.query(`ALTER TABLE usuarios ADD COLUMN ${col.name} ${col.def}`, err => {
                if (err) console.error(`Erro ao adicionar coluna ${col.name} na tabela usuarios:`, err);
                checkUserDone();
              });
            } else {
              checkUserDone();
            }
          });
        });

        // Criar tabela de cache MSAL para persistência no banco
        pool.query(
          `CREATE TABLE IF NOT EXISTS msal_cache (
            id INT PRIMARY KEY,
            cache_data LONGTEXT NOT NULL
          )`,
          (errCache) => {
            if (errCache) {
              console.error('Erro ao criar tabela msal_cache:', errCache);
            } else {
              console.log('Tabela msal_cache verificada/criada com sucesso 🛡️');
            }
          }
        );
pool.query(`
  CREATE TABLE IF NOT EXISTS eventos (
    id_evento INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    data_evento DATE NOT NULL,
    hora_evento TIME NOT NULL,
    id_usuario INT NOT NULL,
    urgencia VARCHAR(20) NOT NULL DEFAULT 'normal',
    cor VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
  )
`, (err) => {
            if (err) {
              console.error('Erro ao criar/atualizar tabela eventos:', err);
              return;
            }

            // 3. Verificar/Adicionar colunas extras na tabela eventos
            const columns = [
              { name: 'urgencia', def: "VARCHAR(20) NOT NULL DEFAULT 'normal'" },
              { name: 'cor', def: "VARCHAR(7) NOT NULL DEFAULT '#3b82f6'" },
              { name: 'repeticao', def: "VARCHAR(20) NOT NULL DEFAULT 'nenhuma'" },
              { name: 'alerta_minutos', def: "INT NOT NULL DEFAULT 0" },
              { name: 'ultimo_alerta_enviado', def: "VARCHAR(10) DEFAULT NULL" },
              { name: 'ultimo_inicio_enviado', def: "VARCHAR(10) DEFAULT NULL" }
            ];

            let pending = columns.length;
            const checkFinished = () => {
              pending--;
              if (pending === 0) {
                console.log('Banco de dados totalmente inicializado e tabelas verificadas! 🚀');
                pool.isInitialized = true;
              }
            };

            columns.forEach(col => {
              pool.query(
                'SHOW COLUMNS FROM eventos LIKE ?',
                [col.name],
                (err, results) => {
                  if (err) {
                    console.error(`Erro ao verificar coluna ${col.name} em eventos:`, err);
                    checkFinished();
                    return;
                  }
                  if (results.length === 0) {
                    pool.query(
                      `ALTER TABLE eventos ADD COLUMN ${col.name} ${col.def}`,
                      (err) => {
                        if (err) {
                          console.error(`Erro ao adicionar coluna ${col.name} em eventos:`, err);
                        }
                        checkFinished();
                      }
                    );
                  } else {
                    checkFinished();
                  }
                }
              );
            });
          }
        );
      }
    );
  }
});

module.exports = pool;