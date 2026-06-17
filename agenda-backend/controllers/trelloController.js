const db = require('../config/db');

// Helper para verificar se o usuário pertence ao grupo
const checkGroupMembership = (id_grupo, id_usuario, callback) => {
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (err, results) => {
      if (err) return callback(err, null);
      if (results.length === 0) return callback(new Error('Acesso negado. Você não é membro deste grupo.'), null);
      callback(null, results[0].funcao);
    }
  );
};

// Obter o quadro, listas e cartões do grupo
exports.getBoard = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    db.query(
      'SELECT * FROM trello_quadros WHERE id_grupo = ?',
      [id_grupo],
      (boardErr, boardResults) => {
        if (boardErr) return res.status(500).json({ error: 'Erro ao buscar quadro' });
        if (boardResults.length === 0) {
          return res.json({ board: null });
        }

        const board = boardResults[0];

        // Buscar listas
        db.query(
          'SELECT * FROM trello_listas WHERE id_quadro = ? ORDER BY posicao ASC',
          [board.id_quadro],
          (listErr, listResults) => {
            if (listErr) return res.status(500).json({ error: 'Erro ao buscar listas' });

            if (listResults.length === 0) {
              return res.json({ board, lists: [], cards: [] });
            }

            // Buscar cartões com responsáveis concatenados
            db.query(
              `SELECT c.*, 
                      (SELECT GROUP_CONCAT(u.id_usuario, ':', u.nome, ':', IFNULL(p.foto_caminho, '')) 
                       FROM trello_cartao_responsaveis cr
                       JOIN usuarios u ON cr.id_usuario = u.id_usuario
                       LEFT JOIN perfis p ON u.id_usuario = p.id_usuario
                       WHERE cr.id_cartao = c.id_cartao) AS responsaveis
               FROM trello_cartoes c
               JOIN trello_listas l ON c.id_lista = l.id_lista
               WHERE l.id_quadro = ?
               ORDER BY c.posicao ASC, c.id_cartao ASC`,
              [board.id_quadro],
              (cardErr, cardResults) => {
                if (cardErr) {
                  console.error('Erro ao carregar cartões:', cardErr);
                  return res.status(500).json({ error: 'Erro ao carregar cartões' });
                }

                // Formatar os responsáveis de string concatenada para array de objetos
                const formattedCards = cardResults.map(c => {
                  const respArray = [];
                  if (c.responsaveis) {
                    c.responsaveis.split(',').forEach(item => {
                      const parts = item.split(':');
                      respArray.push({
                        id_usuario: parseInt(parts[0]),
                        nome: parts[1],
                        foto_caminho: parts[2] || null
                      });
                    });
                  }
                  return { ...c, responsaveis: respArray };
                });

                res.json({
                  board,
                  lists: listResults,
                  cards: formattedCards
                });
              }
            );
          }
        );
      }
    );
  });
};

// Inicializar quadro com listas padrões
exports.createBoard = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const { nome } = req.body;

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    db.query(
      'INSERT INTO trello_quadros (id_grupo, nome) VALUES (?, ?)',
      [id_grupo, nome || 'Quadro de Tarefas'],
      (insErr, result) => {
        if (insErr) return res.status(500).json({ error: 'Erro ao criar quadro' });

        const id_quadro = result.insertId;

        // Inserir listas padrões (A Fazer, Em Andamento, Concluído)
        const defaultLists = ['A Fazer', 'Em Andamento', 'Concluído'];
        const listPromises = defaultLists.map((listName, idx) => {
          return new Promise((resolve, reject) => {
            db.query(
              'INSERT INTO trello_listas (id_quadro, nome, posicao) VALUES (?, ?, ?)',
              [id_quadro, listName, idx],
              (listErr) => {
                if (listErr) reject(listErr);
                else resolve();
              }
            );
          });
        });

        Promise.all(listPromises)
          .then(() => {
            res.status(201).json({ message: 'Quadro de tarefas inicializado!', id_quadro });
          })
          .catch((pErr) => {
            console.error(pErr);
            res.status(500).json({ error: 'Quadro criado, mas falhou ao gerar listas iniciais.' });
          });
      }
    );
  });
};

// Criar nova lista no quadro
exports.createList = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const { nome, id_quadro } = req.body;

  if (!nome || !id_quadro) {
    return res.status(400).json({ error: 'Nome e ID do quadro são obrigatórios' });
  }

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    // Pegar última posição
    db.query(
      'SELECT MAX(posicao) as max_pos FROM trello_listas WHERE id_quadro = ?',
      [id_quadro],
      (posErr, results) => {
        const nextPos = (results[0].max_pos !== null) ? results[0].max_pos + 1 : 0;

        db.query(
          'INSERT INTO trello_listas (id_quadro, nome, posicao) VALUES (?, ?, ?)',
          [id_quadro, nome.trim(), nextPos],
          (insErr, result) => {
            if (insErr) return res.status(500).json({ error: 'Erro ao criar lista' });
            res.status(201).json({ message: 'Lista criada com sucesso!', listId: result.insertId });
          }
        );
      }
    );
  });
};

// Excluir lista
exports.deleteList = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const id_lista = req.params.listId;

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    db.query(
      'DELETE FROM trello_listas WHERE id_lista = ?',
      [id_lista],
      (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Erro ao excluir lista' });
        res.json({ message: 'Lista excluída com sucesso!' });
      }
    );
  });
};

// Criar novo cartão
exports.createCard = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const { id_lista, titulo } = req.body;

  if (!id_lista || !titulo) {
    return res.status(400).json({ error: 'Lista e título são obrigatórios' });
  }

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    // Pegar última posição do cartão na lista
    db.query(
      'SELECT MAX(posicao) as max_pos FROM trello_cartoes WHERE id_lista = ?',
      [id_lista],
      (posErr, results) => {
        const nextPos = (results[0].max_pos !== null) ? results[0].max_pos + 1 : 0;

        db.query(
          'INSERT INTO trello_cartoes (id_lista, titulo, posicao) VALUES (?, ?, ?)',
          [id_lista, titulo.trim(), nextPos],
          (insErr, result) => {
            if (insErr) return res.status(500).json({ error: 'Erro ao criar cartão' });
            res.status(201).json({ message: 'Cartão criado com sucesso!', cardId: result.insertId });
          }
        );
      }
    );
  });
};

// Atualizar cartão
exports.updateCard = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const id_cartao = req.params.cardId;
  const { titulo, descricao, prazo, concluido, id_lista, posicao } = req.body;

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    // Construir consulta dinamicamente para atualizar apenas o que foi fornecido
    const updates = [];
    const params = [];

    if (titulo !== undefined) { updates.push('titulo = ?'); params.push(titulo); }
    if (descricao !== undefined) { updates.push('descricao = ?'); params.push(descricao); }
    if (prazo !== undefined) { updates.push('prazo = ?'); params.push(prazo ? prazo : null); }
    if (concluido !== undefined) { updates.push('concluido = ?'); params.push(concluido ? 1 : 0); }
    if (id_lista !== undefined) { updates.push('id_lista = ?'); params.push(id_lista); }
    if (posicao !== undefined) { updates.push('posicao = ?'); params.push(posicao); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo fornecido para atualização' });
    }

    params.push(id_cartao);

    db.query(
      `UPDATE trello_cartoes SET ${updates.join(', ')} WHERE id_cartao = ?`,
      params,
      (updErr) => {
        if (updErr) {
          console.error(updErr);
          return res.status(500).json({ error: 'Erro ao atualizar cartão' });
        }
        res.json({ message: 'Cartão atualizado com sucesso!' });
      }
    );
  });
};

// Excluir cartão
exports.deleteCard = (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const id_cartao = req.params.cardId;

  checkGroupMembership(id_grupo, id_usuario, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    db.query(
      'DELETE FROM trello_cartoes WHERE id_cartao = ?',
      [id_cartao],
      (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Erro ao excluir cartão' });
        res.json({ message: 'Cartão excluído com sucesso!' });
      }
    );
  });
};

// Atribuir responsável ao cartão
exports.assignMember = (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const id_cartao = req.params.cardId;
  const { id_usuario } = req.body; // ID do membro a atribuir

  checkGroupMembership(id_grupo, id_usuario_logado, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    // Verificar se o usuário a ser atribuído pertence ao grupo
    db.query(
      'SELECT id_participante FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
      [id_grupo, id_usuario],
      (membErr, membResults) => {
        if (membErr || membResults.length === 0) {
          return res.status(400).json({ error: 'O usuário não é participante deste grupo.' });
        }

        db.query(
          'INSERT INTO trello_cartao_responsaveis (id_cartao, id_usuario) VALUES (?, ?)',
          [id_cartao, id_usuario],
          (insErr) => {
            if (insErr) {
              if (insErr.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ error: 'Este membro já está atribuído a este cartão.' });
              }
              return res.status(500).json({ error: 'Erro ao atribuir membro' });
            }
            res.json({ message: 'Membro atribuído com sucesso!' });
          }
        );
      }
    );
  });
};

// Desatribuir responsável do cartão
exports.unassignMember = (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.groupId;
  const id_cartao = req.params.cardId;
  const id_usuario = req.params.userId;

  checkGroupMembership(id_grupo, id_usuario_logado, (err) => {
    if (err) return res.status(403).json({ error: err.message });

    db.query(
      'DELETE FROM trello_cartao_responsaveis WHERE id_cartao = ? AND id_usuario = ?',
      [id_cartao, id_usuario],
      (delErr) => {
        if (delErr) return res.status(500).json({ error: 'Erro ao desatribuir membro' });
        res.json({ message: 'Membro desatribuído com sucesso!' });
      }
    );
  });
};
