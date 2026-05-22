const db = require('../config/db');


exports.createEvent = async (req, res) => {
  const { titulo, descricao, data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos } = req.body;
  const id_usuario = req.user.id;
  const urgenciaValue = urgencia || 'normal';
  const corValue = cor || '#3b82f6';
  const repeticaoValue = repeticao || 'nenhuma';
  const alertaMinutosValue = parseInt(alerta_minutos) || 0;

  try {
    db.query(
      'INSERT INTO eventos (titulo, descricao, data_evento, hora_evento, id_usuario, urgencia, cor, repeticao, alerta_minutos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [titulo, descricao, data_evento, hora_evento, id_usuario, urgenciaValue, corValue, repeticaoValue, alertaMinutosValue],
      async (err, result) => {
        if (err) {
          console.error('Erro no banco ao criar evento:', err);
          return res.status(500).json({ error: 'Erro ao criar evento' });
        }

        res.json({ message: 'Evento criado com sucesso 🚀' });
      }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno' });
  }
};

exports.getEvents = (req, res) => {
  const id_usuario = req.user.id;

  db.query(
    'SELECT id_evento, titulo, descricao, DATE_FORMAT(data_evento, "%Y-%m-%d") as data_evento, hora_evento, urgencia, cor, repeticao, alerta_minutos FROM eventos WHERE id_usuario = ?',
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro ao buscar eventos' });
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