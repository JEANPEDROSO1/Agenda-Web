const db = require('../config/db');
const bcrypt = require('bcryptjs'); // 👈 COLOCA AQUI
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  console.log("Entrou na rota");

  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    console.log("Antes do bcrypt");

    const senhaHash = await bcrypt.hash(senha, 10);

    console.log("Depois do bcrypt");

    db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senhaHash],
      (err) => {
        if (err) {
          console.error(err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Este email já está cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao cadastrar' });
        }

        console.log("Salvou no banco");

        res.json({ message: 'Usuário cadastrado com sucesso 🚀' });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.login = async (req, res) => {
  const { email, senha } = req.body;

  try {
    db.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email],
      async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erro interno' });
        }

        if (results.length === 0) {
          return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        const user = results[0];
        const senhaValida = await bcrypt.compare(senha, user.senha);

        if (!senhaValida) {
          return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        const token = jwt.sign({ id: user.id_usuario, nome: user.nome }, process.env.JWT_SECRET || 'secreta', { expiresIn: '1h' });

        res.json({ token });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno' });
  }
};