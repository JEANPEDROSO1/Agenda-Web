const db = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const { sendPasswordChangeAlert } = require('../api/emailService');

// Buscar dados do perfil do usuário logado
exports.getProfile = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;

  db.query(
    `SELECT u.id_usuario, u.nome, u.email, u.role, p.foto_caminho 
     FROM usuarios u 
     LEFT JOIN perfis p ON u.id_usuario = p.id_usuario 
     WHERE u.id_usuario = ?`,
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('Erro ao buscar perfil:', err);
        return res.status(500).json({ error: 'Erro interno ao carregar perfil' });
      }

      if (results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json({ profile: results[0] });
    }
  );
};

// Atualizar o nome do perfil
exports.updateProfile = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  let { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome é obrigatório' });
  }

  // Formatar o nome capitalizando cada palavra
  nome = nome.trim().split(/\s+/).map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

  db.query(
    'UPDATE usuarios SET nome = ? WHERE id_usuario = ?',
    [nome, id_usuario],
    (err, results) => {
      if (err) {
        console.error('Erro ao atualizar nome:', err);
        return res.status(500).json({ error: 'Erro ao salvar nome no banco de dados' });
      }

      res.json({ message: 'Nome atualizado com sucesso!', nome });
    }
  );
};

// Alterar senha
exports.updatePassword = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
  }

  if (novaSenha.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
  }

  // Buscar senha atual e nome/email do usuário
  db.query(
    'SELECT nome, email, senha FROM usuarios WHERE id_usuario = ?',
    [id_usuario],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const user = results[0];

      try {
        const match = await bcrypt.compare(senhaAtual, user.senha);
        if (!match) {
          return res.status(400).json({ error: 'A senha atual está incorreta' });
        }

        const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

        db.query(
          'UPDATE usuarios SET senha = ? WHERE id_usuario = ?',
          [novaSenhaHash, id_usuario],
          async (updErr) => {
            if (updErr) {
              console.error('Erro ao atualizar senha:', updErr);
              return res.status(500).json({ error: 'Erro ao salvar nova senha' });
            }

            // Enviar e-mail de alerta de alteração de senha
            try {
              await sendPasswordChangeAlert(user.email, user.nome);
            } catch (alertErr) {
              console.error('Erro ao enviar e-mail de alerta de segurança:', alertErr);
            }

            res.json({ message: 'Senha atualizada com sucesso!' });
          }
        );
      } catch (bcryptErr) {
        console.error('Erro no bcrypt:', bcryptErr);
        res.status(500).json({ error: 'Erro interno ao processar senha' });
      }
    }
  );
};

// Upload de foto de perfil
exports.uploadPhoto = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;

  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  // O caminho que salvaremos no banco de dados e exporemos na API
  const foto_caminho = `/uploads/${req.file.filename}`;

  // Verificar se já tem foto no banco para excluir o arquivo antigo do disco
  db.query(
    'SELECT foto_caminho FROM perfis WHERE id_usuario = ?',
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('Erro ao buscar foto antiga:', err);
        return res.status(500).json({ error: 'Erro interno' });
      }

      if (results.length > 0 && results[0].foto_caminho) {
        const antigaFotoPath = results[0].foto_caminho;
        // Caminho absoluto do arquivo antigo no sistema
        const absoluteOldPath = path.join(__dirname, '../uploads', path.basename(antigaFotoPath));
        
        fs.unlink(absoluteOldPath, (unlinkErr) => {
          if (unlinkErr) {
            console.warn('Não foi possível excluir a foto antiga:', unlinkErr.message);
          } else {
            console.log('Foto antiga excluída do disco:', absoluteOldPath);
          }
        });
      }

      // Inserir ou atualizar na tabela perfis
      db.query(
        `INSERT INTO perfis (id_usuario, foto_caminho) 
         VALUES (?, ?) 
         ON DUPLICATE KEY UPDATE foto_caminho = VALUES(foto_caminho)`,
        [id_usuario, foto_caminho],
        (insErr) => {
          if (insErr) {
            console.error('Erro ao salvar foto no banco:', insErr);
            return res.status(500).json({ error: 'Erro ao registrar foto no banco de dados' });
          }

          res.json({ 
            message: 'Foto de perfil atualizada com sucesso!', 
            foto_caminho 
          });
        }
      );
    }
  );
};
