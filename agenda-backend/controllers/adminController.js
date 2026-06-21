const db = require('../config/db');

// Obter métricas gerais e dados de gráficos
exports.getDashboardData = (req, res) => {
  const range = req.query.range || 'mes';
  const mesSelect = req.query.mesSelect || null;

  // Query 1: Contagem de usuários
  const qUsers = 'SELECT COUNT(*) as count FROM usuarios';
  // Query 2: Contagem de grupos
  const qGroups = 'SELECT COUNT(*) as count FROM grupos';
  // Query 3: Contagem de compromissos pessoais
  const qEvents = 'SELECT COUNT(*) as count FROM eventos';
  // Query 4: Contagem de compromissos de grupo
  const qGroupEvents = 'SELECT COUNT(*) as count FROM grupo_eventos';

  // Configurar Query 5 (Crescimento de Usuários) com base nos filtros
  let qUserTimeline = '';
  let paramsUsers = [];
  if (range === 'dia') {
    qUserTimeline = `
      SELECT DATE_FORMAT(criado_em, '%H:00') as data, COUNT(*) as count 
      FROM usuarios 
      WHERE criado_em >= CURDATE()
      GROUP BY data 
      ORDER BY data ASC
    `;
  } else if (range === 'semana') {
    qUserTimeline = `
      SELECT DATE_FORMAT(criado_em, '%Y-%m-%d') as data, COUNT(*) as count 
      FROM usuarios 
      WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY data 
      ORDER BY data ASC
    `;
  } else if (range === 'ano') {
    qUserTimeline = `
      SELECT DATE_FORMAT(criado_em, '%Y-%m') as data, COUNT(*) as count 
      FROM usuarios 
      WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY data 
      ORDER BY data ASC
    `;
  } else { // 'mes'
    if (mesSelect) {
      qUserTimeline = `
        SELECT DATE_FORMAT(criado_em, '%Y-%m-%d') as data, COUNT(*) as count 
        FROM usuarios 
        WHERE DATE_FORMAT(criado_em, '%Y-%m') = ?
        GROUP BY data 
        ORDER BY data ASC
      `;
      paramsUsers = [mesSelect];
    } else {
      qUserTimeline = `
        SELECT DATE_FORMAT(criado_em, '%Y-%m-%d') as data, COUNT(*) as count 
        FROM usuarios 
        WHERE criado_em >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY data 
        ORDER BY data ASC
      `;
    }
  }

  // Configurar Query 6 (Distribuição de Compromissos) com base nos filtros
  let qEventDistribution = '';
  let paramsEvents = [];
  
  const diaSelect = req.query.diaSelect || null;
  const semanaInicio = req.query.semanaInicio || null;
  const semanaFim = req.query.semanaFim || null;

  if (range === 'dia') {
    const diaTarget = diaSelect ? '?' : 'CURDATE()';
    qEventDistribution = `
      SELECT DATE_FORMAT(hora_evento, '%H:00') as data, COUNT(*) as count 
      FROM (
        SELECT hora_evento FROM eventos WHERE data_evento = ${diaTarget}
        UNION ALL
        SELECT hora_evento FROM grupo_eventos WHERE data_evento = ${diaTarget}
      ) as all_events
      GROUP BY data 
      ORDER BY data ASC
    `;
    if (diaSelect) paramsEvents = [diaSelect, diaSelect];
  } else if (range === 'semana') {
    const filterSQL = (semanaInicio && semanaFim) ? 'data_evento >= ? AND data_evento <= ?' : 'data_evento >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND data_evento <= CURDATE()';
    qEventDistribution = `
      SELECT data_evento as data, COUNT(*) as count 
      FROM (
        SELECT data_evento FROM eventos WHERE ${filterSQL}
        UNION ALL
        SELECT data_evento FROM grupo_eventos WHERE ${filterSQL}
      ) as all_events
      GROUP BY data 
      ORDER BY data ASC
    `;
    if (semanaInicio && semanaFim) paramsEvents = [semanaInicio, semanaFim, semanaInicio, semanaFim];
  } else if (range === 'ano') {
    qEventDistribution = `
      SELECT DATE_FORMAT(data_evento, '%Y-%m') as data, COUNT(*) as count 
      FROM (
        SELECT data_evento FROM eventos WHERE data_evento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        UNION ALL
        SELECT data_evento FROM grupo_eventos WHERE data_evento >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      ) as all_events
      GROUP BY data 
      ORDER BY data ASC
    `;
  } else { // 'mes'
    if (mesSelect) {
      qEventDistribution = `
        SELECT data_evento as data, COUNT(*) as count 
        FROM (
          SELECT data_evento FROM eventos WHERE DATE_FORMAT(data_evento, '%Y-%m') = ?
          UNION ALL
          SELECT data_evento FROM grupo_eventos WHERE DATE_FORMAT(data_evento, '%Y-%m') = ?
        ) as all_events
        GROUP BY data 
        ORDER BY data ASC
      `;
      paramsEvents = [mesSelect, mesSelect];
    } else {
      qEventDistribution = `
        SELECT data_evento as data, COUNT(*) as count 
        FROM (
          SELECT data_evento FROM eventos WHERE data_evento >= DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND data_evento <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)
          UNION ALL
          SELECT data_evento FROM grupo_eventos WHERE data_evento >= DATE_SUB(CURDATE(), INTERVAL 15 DAY) AND data_evento <= DATE_ADD(CURDATE(), INTERVAL 15 DAY)
        ) as all_events
        GROUP BY data 
        ORDER BY data ASC
      `;
    }
  }

  // Rodar consultas em paralelo usando promessas
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

  Promise.all([
    run(qUsers),
    run(qGroups),
    run(qEvents),
    run(qGroupEvents),
    run(qUserTimeline, paramsUsers),
    run(qEventDistribution, paramsEvents)
  ])
    .then(([users, groups, events, groupEvents, userTimeline, eventDistribution]) => {
      res.json({
        metrics: {
          totalUsers: users[0].count,
          totalGroups: groups[0].count,
          totalPersonalEvents: events[0].count,
          totalGroupEvents: groupEvents[0].count,
          totalEvents: events[0].count + groupEvents[0].count
        },
        charts: {
          userTimeline,
          eventDistribution
        }
      });
    })
    .catch(err => {
      console.error('Erro ao buscar dados do dashboard admin:', err);
      res.status(500).json({ error: 'Erro ao buscar métricas administrativas.' });
    });
};

// Listar todos os usuários do sistema
exports.listUsers = (req, res) => {
  db.query(
    `SELECT u.id_usuario, u.nome, u.email, u.role, u.verificado, DATE_FORMAT(u.criado_em, '%Y-%m-%d') as criado_em,
            (SELECT COUNT(*) FROM eventos e WHERE e.id_usuario = u.id_usuario) as total_eventos
     FROM usuarios u 
     ORDER BY u.id_usuario ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erro ao listar usuários' });
      res.json({ users: results });
    }
  );
};

// Alterar cargo (role) de um usuário
exports.updateUserRole = (req, res) => {
  const targetUserId = req.params.userId;
  const { role } = req.body;
  const loggedUserId = req.user.id || req.user.id_usuario;

  if (!role || !['user', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Cargo inválido' });
  }

  // Impedir que o próprio administrador altere seu próprio cargo
  if (parseInt(targetUserId) === loggedUserId) {
    return res.status(400).json({ error: 'Você não pode rebaixar a si mesmo!' });
  }

  db.query(
    'UPDATE usuarios SET role = ? WHERE id_usuario = ?',
    [role, targetUserId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao atualizar cargo do usuário' });
      res.json({ message: 'Cargo do usuário atualizado com sucesso!' });
    }
  );
};

// Excluir usuário do sistema
exports.deleteUser = (req, res) => {
  const targetUserId = req.params.userId;
  const loggedUserId = req.user.id || req.user.id_usuario;

  // Impedir que o próprio administrador se exclua
  if (parseInt(targetUserId) === loggedUserId) {
    return res.status(400).json({ error: 'Você não pode excluir a sua própria conta de administrador!' });
  }

  db.query(
    'DELETE FROM usuarios WHERE id_usuario = ?',
    [targetUserId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao excluir usuário' });
      res.json({ message: 'Usuário excluído permanentemente do sistema.' });
    }
  );
};

// Listar todos os grupos do sistema
exports.listGroups = (req, res) => {
  db.query(
    `SELECT g.id_grupo, g.nome, g.id_criador, u.nome as criador_nome,
            (SELECT COUNT(*) FROM grupo_participantes gp WHERE gp.id_grupo = g.id_grupo) as total_membros,
            (SELECT COUNT(*) FROM grupo_eventos ge WHERE ge.id_grupo = g.id_grupo) as total_eventos
     FROM grupos g
     JOIN usuarios u ON g.id_criador = u.id_usuario
     ORDER BY g.id_grupo ASC`,
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erro ao listar grupos' });
      res.json({ groups: results });
    }
  );
};

// Excluir um grupo
exports.deleteGroup = (req, res) => {
  const groupId = req.params.groupId;

  db.query(
    'DELETE FROM grupos WHERE id_grupo = ?',
    [groupId],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao excluir grupo' });
      res.json({ message: 'Grupo excluído permanentemente do sistema.' });
    }
  );
};

// Atualizar dados do usuário (Admin)
exports.updateUser = (req, res) => {
  const targetUserId = req.params.userId;
  const { nome, email, role, verificado } = req.body;
  const loggedUserId = req.user.id || req.user.id_usuario;

  if (!nome || !nome.trim() || !role) {
    return res.status(400).json({ error: 'Nome e cargo são obrigatórios.' });
  }

  // Se o admin estiver atualizando a si mesmo, ele não pode mudar seu cargo ou verificação para evitar se bloquear
  const isMe = parseInt(targetUserId) === loggedUserId;
  const finalRole = isMe ? 'admin' : role;
  const finalVerificado = isMe ? 1 : verificado;

  if (email && email.trim()) {
    db.query(
      'UPDATE usuarios SET nome = ?, email = ?, role = ?, verificado = ? WHERE id_usuario = ?',
      [nome.trim(), email.trim(), finalRole, finalVerificado, targetUserId],
      (err) => {
        if (err) {
          console.error('Erro ao atualizar usuário pelo admin:', err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Este e-mail já está cadastrado em outra conta.' });
          }
          return res.status(500).json({ error: 'Erro ao atualizar dados do usuário.' });
        }
        res.json({ message: 'Dados do usuário atualizados com sucesso!' });
      }
    );
  } else {
    db.query(
      'UPDATE usuarios SET nome = ?, role = ?, verificado = ? WHERE id_usuario = ?',
      [nome.trim(), finalRole, finalVerificado, targetUserId],
      (err) => {
        if (err) {
          console.error('Erro ao atualizar usuário pelo admin:', err);
          return res.status(500).json({ error: 'Erro ao atualizar dados do usuário.' });
        }
        res.json({ message: 'Dados do usuário atualizados com sucesso!' });
      }
    );
  }
};
