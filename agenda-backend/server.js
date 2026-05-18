require('dotenv').config();
require('./config/db');

const express = require('express');
const cors = require('cors');

const app = express();

// Configuração CORS mais permissiva para desenvolvimento
app.use(cors({
  origin: true, // Permite qualquer origem
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'API funcionando',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

const authRoutes = require('./routes/authRoutes');
app.use('/auth', authRoutes);

const eventRoutes = require('./routes/eventRoutes');
app.use('/events', eventRoutes);

const { startScheduler } = require('./api/schedulerService');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Servidor rodando em http://${HOST}:${PORT} 🚀`);
  startScheduler();
});