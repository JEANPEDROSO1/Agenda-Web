const jwt = require('jsonwebtoken');
const db = require('../config/db');

const authenticateToken = (req, res, next) => {
  let token = req.cookies ? req.cookies.access_token : null;

  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).send('Token não fornecido');
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secreta', (err, user) => {
    if (err) {
      return res.status(401).send('Token inválido ou expirado');
    }
    
    // Garantir que nenhuma funcionalidade protegida possa ser acessada enquanto o e-mail não estiver verificado
    db.query('SELECT verificado, role FROM usuarios WHERE id_usuario = ?', [user.id || user.id_usuario], (dbErr, results) => {
      if (dbErr) {
        console.error('Erro ao verificar status de verificação no middleware:', dbErr);
        return res.status(500).send('Erro interno do servidor');
      }
      if (results.length === 0) {
        return res.status(403).send('Usuário não encontrado');
      }
      if (!results[0].verificado) {
        return res.status(403).send('Conta não verificada. Acesso negado.');
      }
      
      req.user = {
        id: user.id || user.id_usuario,
        id_usuario: user.id || user.id_usuario,
        nome: user.nome,
        role: results[0].role
      };
      next();
    });
  });
};

module.exports = authenticateToken;