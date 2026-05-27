const db = require('../config/db');
const bcrypt = require('bcryptjs'); // 👈 COLOCA AQUI
const jwt = require('jsonwebtoken');
const { sendVerificationEmail } = require('../api/emailService');

exports.register = async (req, res) => {
  console.log("Entrou na rota de registro");

  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  try {
    console.log("Antes do bcrypt");
    const senhaHash = await bcrypt.hash(senha, 10);
    console.log("Depois do bcrypt");

    // Inserir usuário
    db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome, email, senhaHash],
      async (err) => {
        if (err) {
          console.error(err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Este email já está cadastrado' });
          }
          return res.status(500).json({ error: 'Erro ao cadastrar' });
        }

        console.log("Usuário salvo no banco");
        // Gerar código de verificação de 6 dígitos
        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
        // Atualizar coluna
        db.query(
          'UPDATE usuarios SET codigo_verificacao = ?, verificado = 0 WHERE email = ?',
          [codigoVerificacao, email],
          async (err2) => {
            if (err2) {
              console.error('Erro ao salvar código de verificação:', err2);
            } else {
              try {
                await sendVerificationEmail(email, nome, codigoVerificacao);
              } catch (e) {
                console.error('Falha ao enviar e‑mail de verificação:', e);
              }
            }
            // Responder ao cliente que a conta foi criada e precisa verificar
            res.json({ message: 'Usuário cadastrado. Verifique o e‑mail para ativar a conta.' });
          }
        );
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

        // Verificar se a conta já foi verificada
        if (!user.verificado) {
          return res.status(403).json({ error: 'Conta não verificada. Verifique seu e‑mail.' });
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

// Verificar código de confirmação
exports.verify = async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ error: 'Email e código são obrigatórios' });
  }
  try {
    db.query(
      'SELECT codigo_verificacao, verificado, nome FROM usuarios WHERE email = ?',
      [email],
      async (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erro interno' });
        }
        if (results.length === 0) {
          return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const user = results[0];
        if (user.verificado) {
          return res.json({ message: 'Conta já verificada' });
        }
        if (user.codigo_verificacao !== codigo) {
          return res.status(400).json({ error: 'Código de verificação inválido' });
        }
        // Atualizar status
        db.query(
          'UPDATE usuarios SET verificado = 1, codigo_verificacao = NULL WHERE email = ?',
          [email],
          (err2) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ error: 'Erro ao atualizar verificação' });
            }
            const token = jwt.sign({ id: user.id_usuario, nome: user.nome }, process.env.JWT_SECRET || 'secreta', { expiresIn: '1h' });
            res.json({ message: 'Verificação concluída', token });
          }
        );
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Reenviar código de verificação
exports.resendCode = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email é obrigatório' });
  }
  try {
    db.query('SELECT nome FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      const nome = results[0].nome;
      const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();
      db.query('UPDATE usuarios SET codigo_verificacao = ?, verificado = 0 WHERE email = ?', [codigoVerificacao, email], async (err2) => {
        if (err2) {
          console.error('Erro ao atualizar código de verificação:', err2);
          return res.status(500).json({ error: 'Erro ao gerar novo código' });
        }
        try {
          await sendVerificationEmail(email, nome, codigoVerificacao);
        } catch (e) {
          console.error('Falha ao enviar e‑mail de verificação:', e);
        }
        res.json({ message: 'Novo código de verificação enviado' });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
};