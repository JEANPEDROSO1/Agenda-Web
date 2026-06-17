const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authenticateToken = require('../middleware/auth');
const adminCheck = require('../middleware/admin');

// Todas as rotas administrativas necessitam de token JWT e privilégio 'admin'
router.use(authenticateToken);
router.use(adminCheck);

router.get('/dashboard', adminController.getDashboardData);
router.get('/users', adminController.listUsers);
router.put('/users/:userId/role', adminController.updateUserRole);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/groups', adminController.listGroups);
router.delete('/groups/:groupId', adminController.deleteGroup);

module.exports = router;
