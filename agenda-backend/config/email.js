const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // ou outro serviço
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendEventAlert = async (email, titulo, data, link) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Alerta de Evento Próximo',
    html: `
      <h2>Seu evento está próximo!</h2>
      <p><strong>${titulo}</strong></p>
      <p>Data: ${data}</p>
      <p><a href="${link}">Ver Evento</a></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email enviado');
  } catch (error) {
    console.error('Erro ao enviar email:', error);
  }
};