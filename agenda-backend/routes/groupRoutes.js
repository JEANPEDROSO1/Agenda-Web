const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authenticateToken = require('../middleware/auth');

// Rotas protegidas por token JWT
router.get('/', authenticateToken, groupController.getGroups);
router.post('/', authenticateToken, groupController.createGroup);
router.get('/:id', authenticateToken, groupController.getGroupById);
router.delete('/:id', authenticateToken, groupController.deleteGroup);

// Membros do grupo
router.post('/:id/members', authenticateToken, groupController.addMember);
router.put('/:id/members/:userId/role', authenticateToken, groupController.updateMemberRole);
router.delete('/:id/members/:userId', authenticateToken, groupController.removeMember);
router.put('/:id/transfer-owner', authenticateToken, groupController.transferOwnership);

// Eventos do grupo
router.get('/:id/events', authenticateToken, groupController.getGroupEvents);
router.post('/:id/events', authenticateToken, groupController.createGroupEvent);
router.put('/:id/events/:eventId', authenticateToken, groupController.updateGroupEvent);
router.delete('/:id/events/:eventId', authenticateToken, groupController.deleteGroupEvent);

module.exports = router;
