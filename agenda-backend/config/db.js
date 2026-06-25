const path = require('path');

// Limpar variáveis do OS que vieram como strings vazias, para que o dotenv ou o fallback possam funcionar
const envKeysToClean = ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PORT'];
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
      password: process.env.DB_PASS !== undefined ? process.env.DB_PASS : 'root',
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
    console.log('Conectado ao MySQL via Pool');
    connection.release();

    const runQuery = (sql, params = []) => {
      return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    };

    async function initializeDatabase() {
      try {
        console.log('Iniciando criação de tabelas e colunas...');

        // 1. Tabela usuarios
        await runQuery(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id_usuario INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            senha VARCHAR(255) NOT NULL
          )
        `);

        // Garantir colunas de verificação e role na tabela usuarios
        const userCols = [
          { name: 'codigo_verificacao', def: "VARCHAR(6) DEFAULT NULL" },
          { name: 'verificado', def: "TINYINT(1) NOT NULL DEFAULT 0" },
          { name: 'codigo_expiracao', def: "DATETIME DEFAULT NULL" },
          { name: 'role', def: "VARCHAR(50) DEFAULT 'user'" },
          { name: 'criado_em', def: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP" }
        ];
        for (const col of userCols) {
          const results = await runQuery('SHOW COLUMNS FROM usuarios LIKE ?', [col.name]);
          if (results.length === 0) {
            console.log(`Adicionando coluna ${col.name} na tabela usuarios...`);
            await runQuery(`ALTER TABLE usuarios ADD COLUMN ${col.name} ${col.def}`);
          }
        }

        // Promover automaticamente o primeiro usuário cadastrado caso não exista nenhum admin
        const admins = await runQuery("SELECT COUNT(*) as count FROM usuarios WHERE role = 'admin'");
        if (admins[0].count === 0) {
          console.log('Nenhum admin encontrado. Promovendo o primeiro usuário cadastrado...');
          await runQuery("UPDATE usuarios SET role = 'admin' WHERE id_usuario = (SELECT min_id FROM (SELECT MIN(id_usuario) AS min_id FROM usuarios) AS tmp) AND role != 'admin'");
        }

        // 2. Tabela msal_cache
        await runQuery(`
          CREATE TABLE IF NOT EXISTS msal_cache (
            id INT PRIMARY KEY,
            cache_data LONGTEXT NOT NULL
          )
        `);

        // 3. Tabela eventos (pessoais)
        await runQuery(`
          CREATE TABLE IF NOT EXISTS eventos (
            id_evento INT AUTO_INCREMENT PRIMARY KEY,
            titulo VARCHAR(255) NOT NULL,
            descricao TEXT,
            data_evento DATE NOT NULL,
            hora_evento TIME NOT NULL,
            id_usuario INT NOT NULL,
            urgencia VARCHAR(20) NOT NULL DEFAULT 'normal',
            cor VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
            repeticao VARCHAR(20) NOT NULL DEFAULT 'nenhuma',
            alerta_minutos INT NOT NULL DEFAULT 0,
            ultimo_alerta_enviado VARCHAR(10) DEFAULT NULL,
            ultimo_inicio_enviado VARCHAR(10) DEFAULT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
          )
        `);

        // Garantir colunas extras em eventos
        const eventCols = [
          { name: 'urgencia', def: "VARCHAR(20) NOT NULL DEFAULT 'normal'" },
          { name: 'cor', def: "VARCHAR(7) NOT NULL DEFAULT '#3b82f6'" },
          { name: 'repeticao', def: "VARCHAR(20) NOT NULL DEFAULT 'nenhuma'" },
          { name: 'alerta_minutos', def: "INT NOT NULL DEFAULT 0" },
          { name: 'ultimo_alerta_enviado', def: "VARCHAR(10) DEFAULT NULL" },
          { name: 'ultimo_inicio_enviado', def: "VARCHAR(10) DEFAULT NULL" }
        ];
        for (const col of eventCols) {
          const results = await runQuery('SHOW COLUMNS FROM eventos LIKE ?', [col.name]);
          if (results.length === 0) {
            console.log(`Adicionando coluna ${col.name} na tabela eventos...`);
            await runQuery(`ALTER TABLE eventos ADD COLUMN ${col.name} ${col.def}`);
          }
        }

        // 4. Tabela refresh_tokens
        await runQuery(`
          CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT NOT NULL,
            token VARCHAR(500) UNIQUE NOT NULL,
            expira_em DATETIME NOT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
          )
        `);

        // 5. Tabela perfis
        await runQuery(`
          CREATE TABLE IF NOT EXISTS perfis (
            id_perfil INT AUTO_INCREMENT PRIMARY KEY,
            id_usuario INT UNIQUE NOT NULL,
            foto_caminho LONGTEXT DEFAULT NULL,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
          )
        `);

        // 6. Tabela grupos
        await runQuery(`
          CREATE TABLE IF NOT EXISTS grupos (
            id_grupo INT AUTO_INCREMENT PRIMARY KEY,
            nome VARCHAR(255) NOT NULL,
            id_criador INT NOT NULL,
            FOREIGN KEY (id_criador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
          )
        `);

        // 7. Tabela grupo_participantes
        await runQuery(`
          CREATE TABLE IF NOT EXISTS grupo_participantes (
            id_participante INT AUTO_INCREMENT PRIMARY KEY,
            id_grupo INT NOT NULL,
            id_usuario INT NOT NULL,
            funcao VARCHAR(50) NOT NULL DEFAULT 'membro',
            FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
            UNIQUE KEY unique_grupo_usuario (id_grupo, id_usuario)
          )
        `);

        // 8. Tabela grupo_eventos
        await runQuery(`
          CREATE TABLE IF NOT EXISTS grupo_eventos (
            id_grupo_evento INT AUTO_INCREMENT PRIMARY KEY,
            id_grupo INT NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            descricao TEXT,
            data_evento DATE NOT NULL,
            hora_evento TIME NOT NULL,
            local VARCHAR(255) DEFAULT NULL,
            id_criador INT NOT NULL,
            cor VARCHAR(7) NOT NULL DEFAULT '#8b5cf6',
            urgencia VARCHAR(20) NOT NULL DEFAULT 'normal',
            repeticao VARCHAR(20) NOT NULL DEFAULT 'nenhuma',
            alerta_minutos INT NOT NULL DEFAULT 0,
            ultimo_alerta_enviado VARCHAR(10) DEFAULT NULL,
            ultimo_inicio_enviado VARCHAR(10) DEFAULT NULL,
            FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE,
            FOREIGN KEY (id_criador) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
          )
        `);

        // Garantir colunas extras em grupo_eventos
        const groupEventCols = [
          { name: 'urgencia', def: "VARCHAR(20) NOT NULL DEFAULT 'normal'" },
          { name: 'cor', def: "VARCHAR(7) NOT NULL DEFAULT '#8b5cf6'" },
          { name: 'repeticao', def: "VARCHAR(20) NOT NULL DEFAULT 'nenhuma'" },
          { name: 'alerta_minutos', def: "INT NOT NULL DEFAULT 0" },
          { name: 'ultimo_alerta_enviado', def: "VARCHAR(10) DEFAULT NULL" },
          { name: 'ultimo_inicio_enviado', def: "VARCHAR(10) DEFAULT NULL" }
        ];
        for (const col of groupEventCols) {
          const results = await runQuery('SHOW COLUMNS FROM grupo_eventos LIKE ?', [col.name]);
          if (results.length === 0) {
            console.log(`Adicionando coluna ${col.name} na tabela grupo_eventos...`);
            await runQuery(`ALTER TABLE grupo_eventos ADD COLUMN ${col.name} ${col.def}`);
          }
        }

        // Garantir que foto_caminho suporte Base64 (LONGTEXT)
        const profileCols = await runQuery("SHOW COLUMNS FROM perfis LIKE 'foto_caminho'");
        if (profileCols.length > 0 && profileCols[0].Type !== 'longtext') {
          console.log('Alterando coluna foto_caminho para LONGTEXT na tabela perfis...');
          await runQuery('ALTER TABLE perfis MODIFY foto_caminho LONGTEXT');
        }

        // 9. Tabela trello_quadros
        await runQuery(`
          CREATE TABLE IF NOT EXISTS trello_quadros (
            id_quadro INT AUTO_INCREMENT PRIMARY KEY,
            id_grupo INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            FOREIGN KEY (id_grupo) REFERENCES grupos(id_grupo) ON DELETE CASCADE
          )
        `);

        // 10. Tabela trello_listas
        await runQuery(`
          CREATE TABLE IF NOT EXISTS trello_listas (
            id_lista INT AUTO_INCREMENT PRIMARY KEY,
            id_quadro INT NOT NULL,
            nome VARCHAR(255) NOT NULL,
            posicao INT NOT NULL DEFAULT 0,
            FOREIGN KEY (id_quadro) REFERENCES trello_quadros(id_quadro) ON DELETE CASCADE
          )
        `);

        // 11. Tabela trello_cartoes
        await runQuery(`
          CREATE TABLE IF NOT EXISTS trello_cartoes (
            id_cartao INT AUTO_INCREMENT PRIMARY KEY,
            id_lista INT NOT NULL,
            titulo VARCHAR(255) NOT NULL,
            descricao TEXT,
            prazo DATE DEFAULT NULL,
            concluido TINYINT(1) NOT NULL DEFAULT 0,
            posicao INT NOT NULL DEFAULT 0,
            FOREIGN KEY (id_lista) REFERENCES trello_listas(id_lista) ON DELETE CASCADE
          )
        `);

        // 12. Tabela trello_cartao_responsaveis
        await runQuery(`
          CREATE TABLE IF NOT EXISTS trello_cartao_responsaveis (
            id_cartao_responsavel INT AUTO_INCREMENT PRIMARY KEY,
            id_cartao INT NOT NULL,
            id_usuario INT NOT NULL,
            FOREIGN KEY (id_cartao) REFERENCES trello_cartoes(id_cartao) ON DELETE CASCADE,
            FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
            UNIQUE KEY unique_cartao_responsavel (id_cartao, id_usuario)
          )
        `);

        // 13. Tabela recuperacao_senha
        await runQuery(`
          CREATE TABLE IF NOT EXISTS recuperacao_senha (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            codigo VARCHAR(6) NOT NULL,
            expira_em DATETIME NOT NULL,
            verificado TINYINT(1) NOT NULL DEFAULT 0
          )
        `);

        console.log('Banco de dados totalmente inicializado e tabelas verificadas!');
        pool.isInitialized = true;
      } catch (error) {
        console.error('Erro na inicialização do Banco de Dados:', error);
      }
    }

    initializeDatabase();
  }
});

module.exports = pool;