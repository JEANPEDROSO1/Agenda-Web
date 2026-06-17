const adminCheck = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).send('Acesso negado. Esta área é restrita a administradores.');
  }
};

module.exports = adminCheck;
