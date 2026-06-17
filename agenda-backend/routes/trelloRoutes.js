const express = require('express');
const router = express.Router();
const trelloController = require('../controllers/trelloController');
const authenticateToken = require('../middleware/auth');

// Rotas integradas no escopo do grupo (/groups/:groupId/trello/...)
// O prefixo "/groups" é registrado no server.js, montando esta rota aninhada ou separada.
// Para ficar mais simples e limpo, podemos registrar como uma rota principal /trello, ou aninhada em groups.
// Vamos registrar as rotas em /groups/:groupId/trello no server.js ou diretamente neste arquivo.
// Definiremos as rotas assumindo o prefixo "/groups/:groupId/trello"
router.get('/board', authenticateToken, trelloController.getBoard);
router.post('/board', authenticateToken, trelloController.createBoard);
router.post('/lists', authenticateToken, trelloController.createList);
router.delete('/lists/:listId', authenticateToken, trelloController.deleteList);
router.post('/cards', authenticateToken, trelloController.createCard);
router.put('/cards/:cardId', authenticateToken, trelloController.updateCard);
router.delete('/cards/:cardId', authenticateToken, trelloController.deleteCard);
router.post('/cards/:cardId/assignees', authenticateToken, trelloController.assignMember);
router.delete('/cards/:cardId/assignees/:userId', authenticateToken, trelloController.unassignMember);

module.exports = router;
