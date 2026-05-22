const db = require('../config/db');
const { checkAndSendEmails } = require('../api/schedulerService');
const { sendEventEmail, sendEventAlertEmail } = require('../api/emailService');


exports.createEvent = async (req, res) => {
  const { titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos } = req.body;
  const id_usuario = req.user ? (req.user.id || req.user.id_usuario) : null;
  
  if (!id_usuario) {
    console.error('createEvent: id_usuario não encontrado no token/req.user');
    return res.status(401).json({ error: 'Usuário não autenticado ou token inválido' });
  }
  
  const urgenciaValue = urgencia || 'normal';
  const corValue = cor || '#3b82f6';
  const repeticaoValue = repeticao || 'nenhuma';
  const alertaMinutosValue = parseInt(alerta_minutos) || 0;

  const fullInsert = () => new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO eventos (titulo, descricao, data_evento, hora_evento, id_usuario, urgencia, cor, repeticao, alerta_minutos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, descricao, data_evento, hora_evento, id_usuario, urgenciaValue, corValue, repeticaoValue, alertaMinutosValue],
      (err, result) => { if (err) reject(err); else resolve(result); }
    );
  });

  const fallbackInsert = () => new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO eventos (titulo, descricao, data_evento, hora_evento, id_usuario, urgencia, cor) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [titulo, descricao, data_evento, hora_evento, id_usuario, urgenciaValue, corValue],
      (err, result) => { if (err) reject(err); else resolve(result); }
    );
  });

  try {
    try {
      await fullInsert();
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('Colunas extras ausentes, usando insert reduzido...');
        await fallbackInsert();
      } else {
        throw err;
      }
    }
    res.json({ message: 'Evento criado com sucesso 🚀' });
  // Verifica imediatamente se há e‑mails a enviar após a criação
  checkAndSendEmails();
  } catch (error) {
    console.error('Erro no banco ao criar evento:', error);
    res.status(500).json({ error: 'Erro ao criar evento', details: error.message, code: error.code });
  }
};

exports.getEvents = (req, res) => {
  const id_usuario = req.user ? (req.user.id || req.user.id_usuario) : null;
  
  if (!id_usuario) {
    console.error('getEvents: id_usuario não encontrado no token/req.user');
    return res.status(401).json({ error: 'Usuário não autenticado ou token inválido' });
  }

  // Try full query with all columns
  db.query(
    "SELECT id_evento, titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos FROM eventos WHERE id_usuario = ?",
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('DB error fetching events (full query):', err.code, err.message);

        // Se a coluna não existe, tenta query reduzida
        if (err.code === 'ER_BAD_FIELD_ERROR') {
          console.warn('Colunas extras ausentes, usando query reduzida...');
          db.query(
            "SELECT id_evento, titulo, descricao, data_evento, hora_evento, COALESCE(urgencia, 'normal') as urgencia, COALESCE(cor, '#3b82f6') as cor, 'nenhuma' as repeticao, 0 as alerta_minutos FROM eventos WHERE id_usuario = ?",
            [id_usuario],
            (err2, results2) => {
              if (err2) {
                console.error('DB error fetching events (fallback query):', err2.message);
                return res.status(500).json({ 
                  error: 'Erro ao buscar eventos', 
                  details: err2.message, 
                  code: err2.code,
                  query: 'fallback' 
                });
              }
              res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
              return res.json(results2);
            }
          );
          return;
        }

        return res.status(500).json({ 
          error: 'Erro ao buscar eventos', 
          details: err.message, 
          code: err.code,
          query: 'full' 
        });
      }
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.json(results);
    }
  );
};


exports.updateEvent = (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos } = req.body;
  const repeticaoValue = repeticao || 'nenhuma';
  const alertaMinutosValue = parseInt(alerta_minutos) || 0;

  db.query(
    'UPDATE eventos SET titulo = ?, descricao = ?, data_evento = ?, hora_evento = ?, urgencia = ?, cor = ?, repeticao = ?, alerta_minutos = ? WHERE id_evento = ?',
    [titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticaoValue, alertaMinutosValue, id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao atualizar evento' });
      }
      res.json({ message: 'Evento atualizado com sucesso 🚀' });
    }
  );
};

exports.deleteEvent = (req, res) => {
  const { id } = req.params;

  db.query(
    'DELETE FROM eventos WHERE id_evento = ?',
    [id],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao excluir evento' });
      }
      res.json({ message: 'Evento excluído com sucesso 🚀' });
    }
  );
};