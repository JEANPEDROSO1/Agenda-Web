const db = require('../config/db');
const bcrypt = require('bcryptjs'); // 👈 COLOCA AQUI
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendRecoveryEmail, sendPasswordChangeAlert } = require('../api/emailService');

exports.register = async (req, res) => {
  console.log("Entrou na rota de registro");

  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  // 1. Verificar se já existe um usuário com o mesmo e-mail e obter contagem total
  console.time('check-email');
  db.query(
    'SELECT (SELECT COUNT(*) FROM usuarios WHERE email = ?) as emailExists, (SELECT COUNT(*) FROM usuarios) as totalUsers',
    [email],
    async (errCheck, resultsCheck) => {
      console.timeEnd('check-email');
      if (errCheck) {
        console.error('Erro ao verificar duplicidade de e-mail:', errCheck);
        return res.status(500).json({ error: 'Erro interno ao verificar cadastro' });
      }

      const emailExists = resultsCheck && resultsCheck[0] && resultsCheck[0].emailExists > 0;
      const totalUsers = resultsCheck && resultsCheck[0] ? resultsCheck[0].totalUsers : 0;

      if (emailExists) {
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

        const role = totalUsers === 0 ? 'admin' : 'user';

        // 4. Salvar usuário no banco (um único INSERT com colunas de verificação e role)
        console.time('insert-user');
        db.query(
          'INSERT INTO usuarios (nome, email, senha, codigo_verificacao, verificado, codigo_expiracao, role) VALUES (?, ?, ?, ?, 0, DATE_ADD(NOW(), INTERVAL 10 MINUTE), ?)',
          [nome, email, senhaHash, codigoVerificacao, role],
          (errInsert) => {
            console.timeEnd('insert-user');
            if (errInsert) {
              console.error('Erro ao inserir usuário:', errInsert);
              if (errInsert.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Já existe uma conta cadastrada com este e-mail.' });
              }
              return res.status(500).json({ error: 'Erro ao cadastrar' });
            }

            console.log("Usuário salvo no banco com role:", role);

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

const isProd = process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'));

const cookieOptionsAccess = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000 // 15 minutos
};

const cookieOptionsRefresh = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
};

const generateTokens = async (user, res) => {
  const accessToken = jwt.sign(
    { id_usuario: user.id_usuario, nome: user.nome, role: user.role },
    process.env.JWT_SECRET || 'secreta',
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id_usuario: user.id_usuario },
    process.env.JWT_REFRESH_SECRET || 'secreta_refresh',
    { expiresIn: '7d' }
  );

  // Salvar refresh token no banco de dados com data de expiração
  const expiraEm = new Date();
  expiraEm.setDate(expiraEm.getDate() + 7);

  await new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO refresh_tokens (id_usuario, token, expira_em) VALUES (?, ?, ?)',
      [user.id_usuario, refreshToken, expiraEm],
      (err) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') {
            resolve();
          } else {
            reject(err);
          }
        } else {
          resolve();
        }
      }
    );
  });

  // Set cookies
  res.cookie('access_token', accessToken, cookieOptionsAccess);
  res.cookie('refresh_token', refreshToken, cookieOptionsRefresh);

  return { accessToken, refreshToken };
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

        try {
          const tokens = await generateTokens(user, res);
          res.json({
            message: 'Login realizado com sucesso',
            token: tokens.accessToken,
            user: {
              id: user.id_usuario,
              nome: user.nome,
              email: user.email,
              role: user.role
            }
          });
        } catch (tokErr) {
          console.error('Erro ao gerar tokens:', tokErr);
          res.status(500).json({ error: 'Erro ao processar login' });
        }
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
      'SELECT id_usuario, codigo_verificacao, verificado, nome, email, role, (codigo_expiracao IS NULL OR codigo_expiracao < NOW()) AS expirado FROM usuarios WHERE email = ?',
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
          async (err2) => {
            if (err2) {
              console.error(err2);
              return res.status(500).json({ error: 'Erro ao atualizar verificação' });
            }
            try {
              const tokens = await generateTokens(user, res);
              res.json({
                message: 'Verificação concluída',
                token: tokens.accessToken,
                user: {
                  id: user.id_usuario,
                  nome: user.nome,
                  email: user.email,
                  role: user.role
                }
              });
            } catch (tokErr) {
              console.error('Erro ao gerar tokens na verificação:', tokErr);
              res.status(500).json({ error: 'Erro ao iniciar sessão do usuário' });
            }
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

// Novo endpoint para renovação automática (Refresh Token)
exports.refresh = async (req, res) => {
  const refreshToken = req.cookies ? req.cookies.refresh_token : null;

  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token não fornecido' });
  }

  try {
    // Verificar se o refresh token existe no banco e não expirou
    db.query(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expira_em > NOW()',
      [refreshToken],
      (err, results) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Erro interno ao validar sessão' });
        }

        if (results.length === 0) {
          return res.status(401).json({ error: 'Sessão inválida ou expirada' });
        }

        const storedToken = results[0];

        // Validar assinatura do refresh token
        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'secreta_refresh', (jwtErr, decoded) => {
          if (jwtErr) {
            // Se falhar, limpa do banco
            db.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken]);
            return res.status(401).json({ error: 'Sessão inválida ou expirada' });
          }

          // Buscar dados atualizados do usuário
          db.query(
            'SELECT id_usuario, nome, email, role FROM usuarios WHERE id_usuario = ?',
            [storedToken.id_usuario],
            (userErr, userResults) => {
              if (userErr || userResults.length === 0) {
                return res.status(401).json({ error: 'Usuário não encontrado' });
              }

              const user = userResults[0];

              // Gerar novo access token
              const newAccessToken = jwt.sign(
                { id_usuario: user.id_usuario, nome: user.nome, role: user.role },
                process.env.JWT_SECRET || 'secreta',
                { expiresIn: '15m' }
              );

              // Atualizar cookie do access token
              res.cookie('access_token', newAccessToken, cookieOptionsAccess);

              res.json({ token: newAccessToken });
            }
          );
        });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

// Novo endpoint para Logout (limpa cookies e banco)
exports.logout = async (req, res) => {
  const refreshToken = req.cookies ? req.cookies.refresh_token : null;

  const performClear = () => {
    res.clearCookie('access_token', cookieOptionsAccess);
    res.clearCookie('refresh_token', cookieOptionsRefresh);
    res.json({ message: 'Sessão encerrada com sucesso' });
  };

  if (!refreshToken) {
    return performClear();
  }

  // Deletar o refresh token do banco
  db.query('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken], (err) => {
    if (err) {
      console.error('Erro ao deletar refresh token no logout:', err);
    }
    performClear();
  });
};

// Novo endpoint para obter dados do usuário autenticado no momento
exports.me = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;

  db.query(
    'SELECT u.id_usuario, u.nome, u.email, u.role, p.foto_caminho FROM usuarios u LEFT JOIN perfis p ON u.id_usuario = p.id_usuario WHERE u.id_usuario = ?',
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ user: results[0] });
    }
  );
};

// --- FLUXO DE RECUPERAÇÃO DE SENHA ---

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'O e-mail é obrigatório' });
  }

  try {
    db.query('SELECT nome, verificado FROM usuarios WHERE email = ?', [email], async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'E-mail não cadastrado.' });
      }

      if (results[0].verificado === 0) {
        return res.status(403).json({ error: 'E-mail não verificado. Confirme seu e-mail antes de alterar a senha.' });
      }

      const nome = results[0].nome;
      const codigo = Math.floor(100000 + Math.random() * 900000).toString();

      // Limpar solicitações anteriores deste e-mail para não acumular
      db.query('DELETE FROM recuperacao_senha WHERE email = ?', [email], (delErr) => {
        if (delErr) console.error('Erro ao limpar códigos de recuperação antigos:', delErr);

        db.query(
          'INSERT INTO recuperacao_senha (email, codigo, expira_em, verificado) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0)',
          [email, codigo],
          async (insErr) => {
            if (insErr) {
              console.error(insErr);
              return res.status(500).json({ error: 'Erro ao gerar código de recuperação' });
            }

            try {
              await sendRecoveryEmail(email, nome, codigo);
              res.json({ message: 'Se este e-mail estiver cadastrado, um código de verificação foi enviado.' });
            } catch (mailErr) {
              console.error('Falha ao enviar e-mail de recuperação:', mailErr);
              res.status(500).json({ error: 'Erro ao enviar e-mail' });
            }
          }
        );
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.verifyRecoveryCode = async (req, res) => {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ error: 'Email e código são obrigatórios' });
  }

  db.query(
    'SELECT * FROM recuperacao_senha WHERE email = ? AND codigo = ? AND expira_em > NOW() AND verificado = 0',
    [email, codigo],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'Código inválido ou expirado.' });
      }

      const recoveryRequest = results[0];

      db.query('UPDATE recuperacao_senha SET verificado = 1 WHERE id = ?', [recoveryRequest.id], (updErr) => {
        if (updErr) {
          console.error(updErr);
          return res.status(500).json({ error: 'Erro ao validar código' });
        }
        res.json({ message: 'Código verificado com sucesso.' });
      });
    }
  );
};

exports.resetPassword = async (req, res) => {
  const { email, codigo, novaSenha } = req.body;
  if (!email || !codigo || !novaSenha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  }

  db.query(
    'SELECT * FROM recuperacao_senha WHERE email = ? AND codigo = ? AND verificado = 1',
    [email, codigo],
    async (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno' });
      }

      if (results.length === 0) {
        return res.status(400).json({ error: 'Operação não autorizada. Verifique seu código primeiro.' });
      }

      try {
        const senhaHash = await bcrypt.hash(novaSenha, 10);

        db.query('UPDATE usuarios SET senha = ? WHERE email = ?', [senhaHash, email], (updErr) => {
          if (updErr) {
            console.error(updErr);
            return res.status(500).json({ error: 'Erro ao atualizar senha' });
          }

          // Deletar o código verificado
          db.query('DELETE FROM recuperacao_senha WHERE email = ?', [email]);

          // Buscar nome do usuário para o e-mail de alerta de segurança
          db.query('SELECT nome FROM usuarios WHERE email = ?', [email], async (userErr, userRes) => {
            if (!userErr && userRes.length > 0) {
              try {
                await sendPasswordChangeAlert(email, userRes[0].nome);
              } catch (alertErr) {
                console.error('Falha ao enviar e-mail de alerta de senha alterada:', alertErr);
              }
            }
          });

          res.json({ message: 'Senha redefinida com sucesso!' });
        });
      } catch (hashErr) {
        console.error(hashErr);
        res.status(500).json({ error: 'Erro interno ao processar senha' });
      }
    }
  );
};