# Sistema de Gestão e Agenda Web

Este é um projeto fullstack para um sistema de gestão e agenda web, desenvolvido com Node.js no backend e HTML/CSS/JavaScript puro no frontend.

## 🚀 Como Rodar o Projeto

### Pré-requisitos
- **Node.js** (versão 14 ou superior)
- **MySQL** (ou MariaDB)
- **Git** (opcional, para clonar o repositório)

### 1. Configurar o Banco de Dados
```bash
# Instalar MySQL (se não tiver)
# No Windows: Baixar do site oficial
# No Linux/Mac: sudo apt install mysql-server

# Criar banco de dados
mysql -u root -p
CREATE DATABASE agenda_web;
exit;
```

### 2. Executar o Script SQL
```bash
# No terminal, navegar até a pasta do backend
cd agenda-backend

# Executar o script de criação das tabelas
mysql -u root -p agenda_web < init.sql
```

### 3. Instalar Dependências do Backend
```bash
cd agenda-backend
npm install
```

### 4. Configurar Variáveis de Ambiente (opcional)
Se quiser usar um arquivo `.env`:
```bash
# Criar arquivo .env na pasta agenda-backend
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=agenda_web
JWT_SECRET=sua_chave_secreta_super_segura
```

### 5. Iniciar o Backend
```bash
cd agenda-backend
npm start
```
O servidor vai rodar em `http://localhost:5000`

### 6. Abrir o Frontend
- Abra seu navegador
- Navegue até a pasta `frontend`
- Abra o arquivo `index.html`
- OU use um servidor local simples

#### Opção A: Servidor Local Simples (Recomendado)
```bash
# Instalar http-server globalmente (se não tiver)
npm install -g http-server

# Na pasta frontend
cd frontend
http-server -p 3000
```
Acesse: `http://localhost:3000`

#### Opção B: Live Server no VS Code
- Instale a extensão "Live Server" no VS Code
- Clique com botão direito no `index.html` dentro de `frontend`
- Selecione "Open with Live Server"
- Acesse a URL mostrada (geralmente `http://127.0.0.1:5500`)

#### Opção C: Python Server (se tiver Python)
```bash
cd frontend
python -m http.server 3000
```
Acesse: `http://localhost:3000`

### 7. Usar o Sistema
1. Acesse a página inicial
2. Clique em "Cadastrar" para criar uma conta
3. Faça login
4. Use o dashboard para gerenciar eventos

## 🛠️ Tecnologias Utilizadas

### Backend
- Node.js
- Express
- MySQL
- bcryptjs (para criptografia de senhas)
- JWT (para autenticação)
- CORS

### Frontend
- HTML5
- CSS3 (com gradientes, animações e responsividade)
- JavaScript (ES6+ com async/await)

## 📁 Estrutura do Projeto

```
agenda-backend/
├── config/
│   └── db.js              # Conexão com MySQL
├── controllers/
│   ├── authController.js  # Lógica de autenticação
│   └── eventController.js # Lógica de eventos
├── middleware/
│   └── auth.js            # Middleware de autenticação JWT
├── routes/
│   ├── authRoutes.js      # Rotas de autenticação
│   └── eventRoutes.js     # Rotas de eventos
├── init.sql               # Script para criar tabelas
├── server.js              # Arquivo principal do servidor
└── package.json

frontend/
├── index.html             # Página inicial moderna
├── cadastro.html          # Página de cadastro
├── login.html             # Página de login
├── dashboard.html         # Dashboard com eventos
├── style.css              # Estilos modernos e responsivos
└── script.js              # JavaScript com notificações e UX melhorada
```

## 🔧 API Endpoints

### Autenticação
- `POST /auth/register` - Cadastrar usuário
- `POST /auth/login` - Fazer login

### Eventos (requer token JWT)
- `POST /events` - Criar evento
- `GET /events/:id_usuario` - Listar eventos do usuário
- `PUT /events/:id` - Atualizar evento
- `DELETE /events/:id` - Excluir evento

## ✨ Funcionalidades

- ✅ Cadastro de usuários com criptografia
- ✅ Login com JWT
- ✅ Criar eventos com data e hora
- ✅ Listar eventos organizados
- ✅ Editar eventos via modal moderno
- ✅ Excluir eventos com confirmação
- ✅ Interface responsiva e moderna
- ✅ Notificações visuais
- ✅ Animações e transições suaves
- ✅ Design com gradientes e glassmorphism

## 🔒 Segurança

- Senhas criptografadas com bcryptjs
- Autenticação JWT com expiração
- Middleware de proteção nas rotas
- Validação de entrada

## 📱 Responsividade

O frontend é totalmente responsivo e funciona bem em:
- Desktop
- Tablet
- Mobile

## 🐛 Troubleshooting Detalhado

### Problema: "Não consigo fazer login/cadastro"
**Sintomas:** Botões não funcionam, erro na console, API não responde.

**Soluções:**
1. **Verificar se o backend está rodando:**
   ```bash
   # Testar se a API responde
   curl http://localhost:5000/
   # Deve retornar: {"message":"API funcionando","status":"OK","timestamp":"..."}
   ```

2. **Verificar se o frontend está sendo servido:**
   ```bash
   # Testar se o frontend responde
   curl http://localhost:4000/
   # Deve retornar o HTML da página
   ```

3. **Testar a API diretamente:**
   - Abra `http://localhost:4000/teste-api.html`
   - Clique nos botões para testar cada função
   - Verifique o console do navegador (F12)

4. **Problemas comuns:**
   - **CORS Error:** Backend não permite requisições do frontend
   - **Porta ocupada:** Mude a porta do frontend para 3001, 8080, etc.
   - **MySQL não conectado:** Verifique se o banco está rodando
   - **Tabela não existe:** Execute o `init.sql` novamente

### Problema: "Live Server não funciona"
**Solução:** Use `http-server` em vez do Live Server:
```bash
npm install -g http-server
cd frontend
http-server -p 4000
```

### Problema: "Erro de CORS"
**Solução:** O backend já está configurado para aceitar requisições de várias portas. Se ainda houver erro, adicione sua porta no `server.js`:
```javascript
app.use(cors({
  origin: ['http://localhost:SUA_PORTA', ...origins existentes]
}));
```

### Problema: "MySQL connection error"
**Solução:**
1. Verifique se o MySQL está instalado e rodando
2. Confirme usuário/senha no `config/db.js`
3. Execute: `CREATE DATABASE agenda_web;`
4. Execute o `init.sql`

### Teste Rápido:
1. Backend: `http://localhost:5000/` deve mostrar JSON
2. Frontend: `http://localhost:4000/` deve carregar a página
3. Teste API: `http://localhost:4000/teste-api.html` para testar funções

Se ainda não funcionar, verifique o console do navegador (F12) para erros específicos.

## 🤝 Contribuição

Sinta-se à vontade para contribuir com melhorias!

## 📄 Licença

Este projeto é para fins educacionais.