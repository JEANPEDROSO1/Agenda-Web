const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).send('Token não fornecido');
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreta', (err, user) => {
    if (err) {
      return res.status(403).send('Token inválido');
    }
    
    // Garantir que nenhuma funcionalidade protegida possa ser acessada enquanto o e-mail não estiver verificado
    db.query('SELECT verificado FROM usuarios WHERE id_usuario = ?', [user.id], (dbErr, results) => {
      if (dbErr) {
        console.error('Erro ao verificar status de verificação no middleware:', dbErr);
        return res.status(500).send('Erro interno do servidor');
      }
      if (results.length === 0 || !results[0].verificado) {
        return res.status(403).send('Conta não verificada. Acesso negado.');
      }
      req.user = user;
      next();
    });
  });
};

module.exports = authenticateToken;