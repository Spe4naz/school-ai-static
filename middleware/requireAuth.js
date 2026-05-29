// middleware/requireAuth.js — Middleware factory for auth + optional role check
const auth = require('./auth');
const logger = require('./logger');
const roles = require('./roles');

function requireAuth(...allowedRoles) {
  const middlewares = [auth, logger];
  if (allowedRoles.length > 0) {
    middlewares.push(roles(...allowedRoles));
  }
  return middlewares;
}

module.exports = requireAuth;
