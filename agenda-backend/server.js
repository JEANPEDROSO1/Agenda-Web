const envKeysToClean = ['DATABASE_URL', 'DB_HOST', 'DB_USER', 'DB_NAME', 'DB_PORT'];
envKeysToClean.forEach(key => {
  if (process.env[key] === '') {
    delete process.env[key];
  }
});

if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
  const path = require('path');
  require('dotenv').config();
  require('dotenv').config({ path: path.join(__dirname, '../.env') });
  require('dotenv').config({ path: '/etc/secrets/.env' });
}
require('./config/db');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();

// Garantir que a pasta de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração CORS mais permissiva para desenvolvimento
app.use(cors({
  origin: true, // Permite qualquer origem
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(uploadsDir));

app.get('/', (req, res) => {
  res.json({
    message: 'API funcionando',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.get('/db-status', (req, res) => {
  const db = require('./config/db');
  if (!db.isInitialized) {
    return res.json({ initialized: false, message: 'Banco de dados ainda não inicializado' });
  }

  db.query('SHOW COLUMNS FROM eventos', (err, columns) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao listar colunas', details: err.message });
    }
    db.query('SELECT COUNT(*) as count FROM usuarios', (err, userCount) => {
      const users = err ? 'erro' : userCount[0].count;
      db.query('SELECT COUNT(*) as count FROM eventos', (err, eventCount) => {
        const events = err ? 'erro' : eventCount[0].count;
        res.json({
          initialized: true,
          users,
          events,
          columns: columns.map(c => ({ Field: c.Field, Type: c.Type })),
          timezone: process.env.TZ || 'not set',
          serverTime: new Date().toISOString()
        });
      });
    });
  });
});

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/events', eventRoutes);

const profileRoutes = require('./routes/profileRoutes');
app.use('/profile', profileRoutes);

const groupRoutes = require('./routes/groupRoutes');
app.use('/groups', groupRoutes);


const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

const { startScheduler } = require('./api/schedulerService');

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startScheduler();
});