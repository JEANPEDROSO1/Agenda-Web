const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { getAuthUrl, acquireTokenByCode } = require('../api/graphClient');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/verify', authController.verify);
router.post('/delete-account', authController.deleteAccount);

// Rotas da Microsoft Graph
router.get('/microsoft', async (req, res) => {
    try {
        const url = await getAuthUrl();
        res.redirect(url);
    } catch (error) {
        console.error("Erro ao gerar URL Microsoft:", error);
        res.status(500).send("Erro ao iniciar login com a Microsoft");
    }
});

router.get('/microsoft/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send("Código de autenticação ausente");
    }
    try {
        await acquireTokenByCode(code);
        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                <h1 style="color: #10b981;">🎉 Autenticado com Sucesso!</h1>
                <p>A API do Microsoft Graph foi conectada à sua conta de e‑mail e os tokens foram salvos de forma segura.</p>
                <p>Você já pode fechar esta aba e testar o envio de e‑mails!</p>
            </div>
        `);
    } catch (error) {
        console.error("Erro no callback da Microsoft:", error);
        res.status(500).send("Erro ao autenticar com a Microsoft: " + error.message);
    }
});

module.exports = router;