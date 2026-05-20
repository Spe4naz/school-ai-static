// middleware/roles.js
module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Доступ запрещён', 
        code: 'FORBIDDEN',
        required: allowedRoles 
      });
    }
    next();
  };
};