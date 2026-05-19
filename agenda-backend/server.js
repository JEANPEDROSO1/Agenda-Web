const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT} 🚀`);
  startScheduler();
});