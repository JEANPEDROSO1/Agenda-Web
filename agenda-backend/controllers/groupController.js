const db = require('../config/db');
const { 
  sendGroupInviteEmail, 
  sendGroupEventCreatedEmail,
  sendGroupEventUpdatedEmail,
  sendGroupEventDeletedEmail
} = require('../api/emailService');

// Listar grupos do usuário logado
exports.getGroups = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;

  db.query(
    `SELECT g.id_grupo, g.nome, g.id_criador, gp.funcao,
            (SELECT COUNT(*) FROM grupo_participantes WHERE id_grupo = g.id_grupo) AS total_membros
     FROM grupos g
     JOIN grupo_participantes gp ON g.id_grupo = gp.id_grupo
     WHERE gp.id_usuario = ?`,
    [id_usuario],
    (err, results) => {
      if (err) {
        console.error('Erro ao buscar grupos:', err);
        return res.status(500).json({ error: 'Erro ao buscar grupos' });
      }
      res.json({ groups: results });
    }
  );
};

// Criar um novo grupo
exports.createGroup = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const { nome } = req.body;

  if (!nome || !nome.trim()) {
    return res.status(400).json({ error: 'O nome do grupo é obrigatório' });
  }

  db.query(
    'INSERT INTO grupos (nome, id_criador) VALUES (?, ?)',
    [nome.trim(), id_usuario],
    (err, result) => {
      if (err) {
        console.error('Erro ao criar grupo:', err);
        return res.status(500).json({ error: 'Erro ao criar grupo no banco de dados' });
      }

      const id_grupo = result.insertId;

      // Inserir o criador como administrador do grupo
      db.query(
        'INSERT INTO grupo_participantes (id_grupo, id_usuario, funcao) VALUES (?, ?, ?)',
        [id_grupo, id_usuario, 'admin'],
        (partErr) => {
          if (partErr) {
            console.error('Erro ao adicionar criador como participante:', partErr);
            return res.status(500).json({ error: 'Erro ao configurar participante' });
          }

          res.status(201).json({
            message: 'Grupo criado com sucesso!',
            group: { id_grupo, nome: nome.trim(), id_criador: id_usuario, funcao: 'admin' }
          });
        }
      );
    }
  );
};

// Detalhes do grupo (membros, dono, etc)
exports.getGroupById = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;

  // Verificar se o usuário pertence ao grupo
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (checkErr, checkResults) => {
      if (checkErr) {
        return res.status(500).json({ error: 'Erro ao verificar permissão' });
      }
      if (checkResults.length === 0) {
        return res.status(403).json({ error: 'Acesso negado. Você não é membro deste grupo.' });
      }

      const minhaFuncao = checkResults[0].funcao;

      // Buscar detalhes do grupo
      db.query(
        'SELECT id_grupo, nome, id_criador FROM grupos WHERE id_grupo = ?',
        [id_grupo],
        (groupErr, groupResults) => {
          if (groupErr || groupResults.length === 0) {
            return res.status(404).json({ error: 'Grupo não encontrado' });
          }

          const group = groupResults[0];

          // Buscar participantes
          db.query(
            `SELECT gp.id_usuario, gp.funcao, u.nome, u.email, p.foto_caminho 
             FROM grupo_participantes gp
             JOIN usuarios u ON gp.id_usuario = u.id_usuario
             LEFT JOIN perfis p ON u.id_usuario = p.id_usuario
             WHERE gp.id_grupo = ?`,
            [id_grupo],
            (membersErr, membersResults) => {
              if (membersErr) {
                return res.status(500).json({ error: 'Erro ao carregar membros' });
              }

              res.json({
                group,
                minhaFuncao,
                members: membersResults
              });
            }
          );
        }
      );
    }
  );
};

// Convidar/Adicionar membro por e-mail
exports.addMember = async (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ error: 'O e-mail do participante é obrigatório' });
  }

  // Verificar se o usuário logado é admin do grupo
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario_logado],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0 || checkResults[0].funcao !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores do grupo podem convidar novos membros.' });
      }

      // Buscar o usuário pelo e-mail
      db.query(
        'SELECT id_usuario, nome, email FROM usuarios WHERE email = ?',
        [email.trim()],
        (userErr, userResults) => {
          if (userErr) {
            return res.status(500).json({ error: 'Erro ao pesquisar usuário' });
          }
          if (userResults.length === 0) {
            return res.status(404).json({ error: 'Nenhum usuário cadastrado com este e-mail.' });
          }

          const novoMembro = userResults[0];

          // Verificar se já é membro
          db.query(
            'SELECT id_participante FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, novoMembro.id_usuario],
            (membCheckErr, membCheckResults) => {
              if (membCheckResults.length > 0) {
                return res.status(400).json({ error: 'Este usuário já é membro do grupo.' });
              }

              // Inserir como participante membro
              db.query(
                'INSERT INTO grupo_participantes (id_grupo, id_usuario, funcao) VALUES (?, ?, ?)',
                [id_grupo, novoMembro.id_usuario, 'membro'],
                async (insErr) => {
                  if (insErr) {
                    return res.status(500).json({ error: 'Erro ao adicionar membro ao grupo' });
                  }

                  // Buscar nome do grupo e do criador/convidador
                  db.query(
                    'SELECT g.nome, u.nome AS nome_convidador FROM grupos g JOIN usuarios u ON g.id_criador = u.id_usuario WHERE g.id_grupo = ?',
                    [id_grupo],
                    async (gErr, gRes) => {
                      if (!gErr && gRes.length > 0) {
                        try {
                          await sendGroupInviteEmail(novoMembro.email, novoMembro.nome, gRes[0].nome, gRes[0].nome_convidador);
                        } catch (mailErr) {
                          console.error('Erro ao enviar e-mail de convite:', mailErr);
                        }
                      }
                    }
                  );

                  res.json({ message: 'Membro adicionado com sucesso!' });
                }
              );
            }
          );
        }
      );
    }
  );
};

// Alterar função de um membro (promover a admin ou rebaixar a membro)
exports.updateMemberRole = async (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const id_membro = req.params.userId;
  const { funcao } = req.body; // 'admin' ou 'membro'

  if (!['admin', 'membro'].includes(funcao)) {
    return res.status(400).json({ error: 'Função inválida. Use admin ou membro.' });
  }

  // Verificar se o usuário logado é admin do grupo
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario_logado],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0 || checkResults[0].funcao !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores do grupo podem alterar permissões.' });
      }

      // Atualizar no banco
      db.query(
        'UPDATE grupo_participantes SET funcao = ? WHERE id_grupo = ? AND id_usuario = ?',
        [funcao, id_grupo, id_membro],
        (updErr) => {
          if (updErr) {
            return res.status(500).json({ error: 'Erro ao atualizar função do membro' });
          }
          res.json({ message: `Membro atualizado para ${funcao} com sucesso!` });
        }
      );
    }
  );
};

// Transferir a propriedade do grupo (id_criador)
exports.transferOwnership = async (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const { novoDonoId } = req.body;

  if (!novoDonoId) {
    return res.status(400).json({ error: 'O ID do novo dono é obrigatório' });
  }

  // Verificar se o usuário logado é o dono atual
  db.query(
    'SELECT id_criador FROM grupos WHERE id_grupo = ?',
    [id_grupo],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      if (results[0].id_criador !== id_usuario_logado) {
        return res.status(403).json({ error: 'Apenas o dono do grupo pode transferir a propriedade.' });
      }

      // Verificar se o novo dono é membro do grupo
      db.query(
        'SELECT id_participante FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
        [id_grupo, novoDonoId],
        (membErr, membResults) => {
          if (membErr || membResults.length === 0) {
            return res.status(400).json({ error: 'O novo dono precisa ser membro ativo do grupo.' });
          }

          // Transferir no banco
          db.query(
            'UPDATE grupos SET id_criador = ? WHERE id_grupo = ?',
            [novoDonoId, id_grupo],
            (transErr) => {
              if (transErr) {
                return res.status(500).json({ error: 'Erro ao transferir propriedade' });
              }

              // Garantir que o novo dono seja admin
              db.query(
                "UPDATE grupo_participantes SET funcao = 'admin' WHERE id_grupo = ? AND id_usuario = ?",
                [id_grupo, novoDonoId],
                () => {
                  res.json({ message: 'Propriedade do grupo transferida com sucesso!' });
                }
              );
            }
          );
        }
      );
    }
  );
};

// Sair do grupo ou remover um membro
exports.removeMember = async (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const id_membro_excluir = req.params.userId;

  const isSaindo = parseInt(id_membro_excluir) === id_usuario_logado;

  // Buscar detalhes do grupo (dono/criador)
  db.query(
    'SELECT id_criador FROM grupos WHERE id_grupo = ?',
    [id_grupo],
    (gErr, gRes) => {
      if (gErr || gRes.length === 0) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      const id_criador = gRes[0].id_criador;

      // Se o usuário excluindo for o criador do grupo, ele não pode sair! Ele precisa transferir a propriedade primeiro.
      if (isSaindo && id_usuario_logado === id_criador) {
        return res.status(400).json({ 
          error: 'Você é o dono/criador deste grupo. Transfira a posse do grupo para outro membro antes de sair.' 
        });
      }

      // Verificar permissões do solicitante
      db.query(
        'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
        [id_grupo, id_usuario_logado],
        (permErr, permResults) => {
          if (permErr || permResults.length === 0) {
            return res.status(403).json({ error: 'Você não faz parte deste grupo.' });
          }

          const funcaoSolicitante = permResults[0].funcao;

          // Se não estiver saindo (está removendo outra pessoa), precisa ser admin do grupo
          if (!isSaindo && funcaoSolicitante !== 'admin') {
            return res.status(403).json({ error: 'Apenas administradores do grupo podem remover membros.' });
          }

          // Impedir que o último administrador saia sem outro administrador no grupo
          db.query(
            'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
            [id_grupo, id_membro_excluir],
            (roleErr, roleResults) => {
              if (roleResults.length > 0 && roleResults[0].funcao === 'admin') {
                // Verificar se existem outros admins no grupo
                db.query(
                  "SELECT COUNT(*) as count FROM grupo_participantes WHERE id_grupo = ? AND funcao = 'admin' AND id_usuario != ?",
                  [id_grupo, id_membro_excluir],
                  (countErr, countResults) => {
                    const outrosAdmins = countResults[0].count;

                    // Se não existirem outros admins, e o grupo possui mais pessoas, impede
                    db.query(
                      'SELECT COUNT(*) as total FROM grupo_participantes WHERE id_grupo = ?',
                      [id_grupo],
                      (totalErr, totalResults) => {
                        const totalMembros = totalResults[0].total;

                        if (outrosAdmins === 0 && totalMembros > 1) {
                          return res.status(400).json({
                            error: 'Impossível remover. O grupo precisa de pelo menos 1 administrador ativo. Promova outro membro a administrador primeiro.'
                          });
                        }

                        // Se passou nas regras de negócio, remove do grupo
                        excluirMembroDoGrupo(id_grupo, id_membro_excluir, res);
                      }
                    );
                  }
                );
              } else {
                // Não é admin, exclui direto
                excluirMembroDoGrupo(id_grupo, id_membro_excluir, res);
              }
            }
          );
        }
      );
    }
  );
};

const excluirMembroDoGrupo = (id_grupo, id_usuario, res) => {
  db.query(
    'DELETE FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (err) => {
      if (err) {
        console.error('Erro ao remover participante:', err);
        return res.status(500).json({ error: 'Erro ao remover participante' });
      }
      res.json({ message: 'Participante removido do grupo com sucesso!' });
    }
  );
};

// Excluir grupo por completo
exports.deleteGroup = async (req, res) => {
  const id_usuario_logado = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;

  db.query(
    'SELECT id_criador FROM grupos WHERE id_grupo = ?',
    [id_grupo],
    (err, results) => {
      if (err || results.length === 0) {
        return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      if (results[0].id_criador !== id_usuario_logado) {
        return res.status(403).json({ error: 'Apenas o criador/dono do grupo pode excluí-lo por completo.' });
      }

      db.query(
        'DELETE FROM grupos WHERE id_grupo = ?',
        [id_grupo],
        (delErr) => {
          if (delErr) {
            return res.status(500).json({ error: 'Erro ao deletar grupo' });
          }
          res.json({ message: 'Grupo excluído com sucesso!' });
        }
      );
    }
  );
};

// ==========================================
// EVENTOS DO GRUPO (CALENDÁRIO COMPARTILHADO)
// ==========================================

// Listar eventos do grupo
exports.getGroupEvents = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;

  // Verificar se o usuário pertence ao grupo
  db.query(
    'SELECT id_participante FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0) {
        return res.status(403).json({ error: 'Você não é membro deste grupo para ver seus eventos.' });
      }

      db.query(
        'SELECT * FROM grupo_eventos WHERE id_grupo = ? ORDER BY data_evento ASC, hora_evento ASC',
        [id_grupo],
        (err, results) => {
          if (err) {
            return res.status(500).json({ error: 'Erro ao carregar eventos do grupo' });
          }
          res.json({ events: results });
        }
      );
    }
  );
};

// Criar evento de grupo
exports.createGroupEvent = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const { titulo, descricao, data_evento, hora_evento, local, cor, urgencia, repeticao, alerta_minutos } = req.body;

  if (!titulo || !data_evento || !hora_evento) {
    return res.status(400).json({ error: 'Título, data e hora são obrigatórios.' });
  }

  // Verificar se o usuário pertence ao grupo e se é administrador
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0 || checkResults[0].funcao !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores do grupo podem criar compromissos coletivos.' });
      }

      db.query(
        `INSERT INTO grupo_eventos (id_grupo, titulo, descricao, data_evento, hora_evento, local, id_criador, cor, urgencia, repeticao, alerta_minutos) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id_grupo, titulo.trim(), descricao, data_evento, hora_evento, local, id_usuario, cor || '#8b5cf6', urgencia || 'normal', repeticao || 'nenhuma', parseInt(alerta_minutos) || 0],
        (err, result) => {
          if (err) {
            console.error('Erro ao criar evento de grupo:', err);
            return res.status(500).json({ error: 'Erro ao registrar evento de grupo' });
          }

          // Notificar membros do grupo por e-mail
          db.query(
            `SELECT u.nome, u.email, g.nome AS nome_grupo, uc.nome AS nome_criador 
             FROM grupo_participantes gp 
             JOIN usuarios u ON gp.id_usuario = u.id_usuario 
             JOIN grupos g ON gp.id_grupo = g.id_grupo 
             JOIN usuarios uc ON uc.id_usuario = ? 
             WHERE gp.id_grupo = ?`,
            [id_usuario, id_grupo],
            async (membErr, members) => {
              if (!membErr && members.length > 0) {
                const formattedDate = new Date(data_evento + 'T' + hora_evento).toLocaleString('pt-BR');
                const link = `http://localhost:8000/grupos.html`; // link correto do calendário do grupo
                
                for (const member of members) {
                  try {
                    await sendGroupEventCreatedEmail(
                      member.email, 
                      member.nome, 
                      member.nome_grupo, 
                      titulo, 
                      formattedDate, 
                      local, 
                      member.nome_criador, 
                      link
                    );
                  } catch (mailErr) {
                    console.error('Erro ao notificar membro:', member.email, mailErr.message);
                  }
                }
              }
            }
          );

          res.status(201).json({ message: 'Evento de grupo criado com sucesso!', eventId: result.insertId });
        }
      );
    }
  );
};

// Atualizar evento de grupo
exports.updateGroupEvent = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const id_evento = req.params.eventId;
  const { titulo, descricao, data_evento, hora_evento, local, cor, urgencia, repeticao, alerta_minutos } = req.body;

  if (!titulo || !data_evento || !hora_evento) {
    return res.status(400).json({ error: 'Título, data e hora são obrigatórios.' });
  }

  // Verificar se o usuário pertence ao grupo e se é administrador
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0 || checkResults[0].funcao !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores do grupo podem alterar compromissos coletivos.' });
      }

      db.query(
        'SELECT id_criador FROM grupo_eventos WHERE id_grupo_evento = ?',
        [id_evento],
        (evErr, evResults) => {
          if (evErr || evResults.length === 0) {
            return res.status(404).json({ error: 'Evento de grupo não encontrado.' });
          }

          db.query(
            `UPDATE grupo_eventos 
             SET titulo = ?, descricao = ?, data_evento = ?, hora_evento = ?, local = ?, cor = ?, urgencia = ?, repeticao = ?, alerta_minutos = ?, ultimo_alerta_enviado = NULL, ultimo_inicio_enviado = NULL 
             WHERE id_grupo_evento = ?`,
            [titulo.trim(), descricao, data_evento, hora_evento, local, cor, urgencia || 'normal', repeticao || 'nenhuma', parseInt(alerta_minutos) || 0, id_evento],
            (updErr) => {
              if (updErr) {
                console.error('Erro ao atualizar evento de grupo:', updErr);
                return res.status(500).json({ error: 'Erro ao atualizar evento de grupo.' });
              }

              // Notificar membros do grupo por e-mail
              db.query(
                `SELECT u.nome, u.email, g.nome AS nome_grupo, uc.nome AS nome_editor 
                 FROM grupo_participantes gp 
                 JOIN usuarios u ON gp.id_usuario = u.id_usuario 
                 JOIN grupos g ON gp.id_grupo = g.id_grupo 
                 JOIN usuarios uc ON uc.id_usuario = ? 
                 WHERE gp.id_grupo = ?`,
                [id_usuario, id_grupo],
                async (membErr, members) => {
                  if (!membErr && members.length > 0) {
                    const formattedDate = new Date(data_evento + 'T' + hora_evento).toLocaleString('pt-BR');
                    const link = `http://localhost:8000/grupos.html`;
                    
                    for (const member of members) {
                      try {
                        await sendGroupEventUpdatedEmail(
                          member.email, 
                          member.nome, 
                          member.nome_grupo, 
                          titulo, 
                          formattedDate, 
                          local, 
                          member.nome_editor, 
                          link
                        );
                      } catch (mailErr) {
                        console.error('Erro ao notificar alteração para membro:', member.email, mailErr.message);
                      }
                    }
                  }
                }
              );

              res.json({ message: 'Evento de grupo atualizado com sucesso!' });
            }
          );
        }
      );
    }
  );
};

// Excluir evento de grupo
exports.deleteGroupEvent = async (req, res) => {
  const id_usuario = req.user.id || req.user.id_usuario;
  const id_grupo = req.params.id;
  const id_evento = req.params.eventId;

  // Verificar se o usuário pertence ao grupo e se é admin
  db.query(
    'SELECT funcao FROM grupo_participantes WHERE id_grupo = ? AND id_usuario = ?',
    [id_grupo, id_usuario],
    (checkErr, checkResults) => {
      if (checkErr || checkResults.length === 0 || checkResults[0].funcao !== 'admin') {
        return res.status(403).json({ error: 'Apenas administradores do grupo podem excluir compromissos coletivos.' });
      }

      db.query(
        'SELECT id_criador, titulo FROM grupo_eventos WHERE id_grupo_evento = ?',
        [id_evento],
        (evErr, evResults) => {
          if (evErr || evResults.length === 0) {
            return res.status(404).json({ error: 'Evento de grupo não encontrado.' });
          }

          const tituloEvento = evResults[0].titulo;

          db.query(
            'DELETE FROM grupo_eventos WHERE id_grupo_evento = ?',
            [id_evento],
            (delErr) => {
              if (delErr) {
                return res.status(500).json({ error: 'Erro ao excluir evento.' });
              }

              // Notificar membros do grupo por e-mail
              db.query(
                `SELECT u.nome, u.email, g.nome AS nome_grupo, uc.nome AS nome_excluidor 
                 FROM grupo_participantes gp 
                 JOIN usuarios u ON gp.id_usuario = u.id_usuario 
                 JOIN grupos g ON gp.id_grupo = g.id_grupo 
                 JOIN usuarios uc ON uc.id_usuario = ? 
                 WHERE gp.id_grupo = ?`,
                [id_usuario, id_grupo],
                async (membErr, members) => {
                  if (!membErr && members.length > 0) {
                    for (const member of members) {
                      try {
                        await sendGroupEventDeletedEmail(
                          member.email, 
                          member.nome, 
                          member.nome_grupo, 
                          tituloEvento, 
                          member.nome_excluidor
                        );
                      } catch (mailErr) {
                        console.error('Erro ao notificar cancelamento para membro:', member.email, mailErr.message);
                      }
                    }
                  }
                }
              );

              res.json({ message: 'Evento excluído com sucesso!' });
            }
          );
        }
      );
    }
  );
};
