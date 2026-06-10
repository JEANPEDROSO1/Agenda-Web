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

  // 1. Verificar se já existe um usuário com o mesmo e-mail
  console.time('check-email');
  db.query(
    'SELECT 1 FROM usuarios WHERE email = ?',
    [email],
    async (errCheck, resultsCheck) => {
      console.timeEnd('check-email');
      if (errCheck) {
        console.error('Erro ao verificar duplicidade de e-mail:', errCheck);
        return res.status(500).json({ error: 'Erro interno ao verificar cadastro' });
      }

      if (resultsCheck && resultsCheck.length > 0) {
        console.log('Email já cadastrado (consulta prévia):', email);
        return res.status(400).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
      }

      try {
        // 2. Gerar hash da senha
        console.time('bcrypt');
        const senhaHash = await bcrypt.hash(senha, 10);
        console.timeEnd('bcrypt');

        // 3. Gerar código de verificação de 6 dígitos
        const codigoVerificacao = Math.floor(100000 + Math.random() * 900000).toString();

        // 4. Salvar usuário no banco (um único INSERT com colunas de verificação)
        console.time('insert-user');
        db.query(
          'INSERT INTO usuarios (nome, email, senha, codigo_verificacao, verificado, codigo_expiracao) VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
          [nome, email, senhaHash, codigoVerificacao],
          (errInsert) => {
            console.timeEnd('insert-user');
            if (errInsert) {
              console.error('Erro ao inserir usuário:', errInsert);
              if (errInsert.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
              }
              return res.status(500).json({ error: 'Erro ao cadastrar' });
            }

            console.log("Usuário salvo no banco");

            // 5. Retornar sucesso para o frontend imediatamente
            res.json({ message: 'Usuário cadastrado. Verifique o e‑mail para ativar a conta.' });

            // 6. Enviar e-mail de verificação em segundo plano sem bloquear a resposta
            console.time('send-email');
            sendVerificationEmail(email, nome, codigoVerificacao)
              .then(() => {
                console.timeEnd('send-email');
                console.log('E-mail de verificação enviado com sucesso em segundo plano.');
              })
              .catch((e) => {
                console.timeEnd('send-email');
                console.error('Falha ao enviar e‑mail de verificação em segundo plano:', e);
              });
          }
        );
      } catch (error) {
        console.error('Erro no fluxo de registro:', error);
        res.status(500).json({ error: 'Erro interno' });
      }
    }
  );
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
      'SELECT id_usuario, codigo_verificacao, verificado, nome, (codigo_expiracao IS NULL OR codigo_expiracao < NOW()) AS expirado FROM usuarios WHERE email = ?',
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
        if (user.expirado) {
          return res.status(400).json({ error: 'Código de verificação expirado. Solicite um novo código.' });
        }
        // Atualizar status
        db.query(
          'UPDATE usuarios SET verificado = 1, codigo_verificacao = NULL, codigo_expiracao = NULL WHERE email = ?',
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
      db.query('UPDATE usuarios SET codigo_verificacao = ?, verificado = 0, codigo_expiracao = DATE_ADD(NOW(), INTERVAL 10 MINUTE) WHERE email = ?', [codigoVerificacao, email], async (err2) => {
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

exports.deleteAccount = async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }
  try {
    // Verify user exists and password
    db.query('SELECT id_usuario, senha FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }
      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      const user = results[0];
      const senhaValida = await bcrypt.compare(senha, user.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }
      // Delete user
      db.query('DELETE FROM usuarios WHERE id_usuario = ?', [user.id_usuario], (delErr) => {
        if (delErr) {
          console.error(delErr);
          return res.status(500).json({ error: 'Erro ao excluir usuário' });
        }
        return res.json({ message: 'Conta excluída com sucesso' });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
};