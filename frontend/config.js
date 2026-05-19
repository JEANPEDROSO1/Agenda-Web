// Se estiver rodando localmente (localhost ou 127.0.0.1), usa a porta 8080 do backend local.
// Se estiver rodando online (ex: Vercel), aponta para a URL do seu backend no Render.
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:8080`
  : `https://agenda-web-t7nj.onrender.com`; // 👈 URL real do seu deploy no Render!

console.log('Configurações da API carregadas:', API_BASE);
