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

app.listen(5000, '0.0.0.0', () => {
  console.log('Servidor rodando em http://0.0.0.0:5000 🚀');
  startScheduler();
});