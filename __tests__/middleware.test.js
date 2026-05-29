process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only_32chars!';

const jwt = require('jsonwebtoken');
const config = require('../config/auth');
const authMiddleware = require('../middleware/auth');
const rolesMiddleware = require('../middleware/roles');
const { validate, loginSchema, registerSchema, createGradeSchema } = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');
const requireAuth = require('../middleware/requireAuth');

function mockReq(overrides = {}) {
  return { headers: {}, body: {}, query: {}, params: {}, method: 'GET', path: '/test', ip: '127.0.0.1', user: null, cookies: {}, ...overrides };
}

function mockRes() {
  const res = { statusCode: 200, _json: null, cookies: {} };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res._json = data; return res; };
  res.cookie = (name, val, opts) => { res.cookies[name] = { val, opts }; return res; };
  res.clearCookie = (name) => { delete res.cookies[name]; return res; };
  return res;
}

function mockNext() { return jest.fn(); }

describe('auth middleware', () => {
  test('no token → 401', () => {
    const req = mockReq();
    const res = mockRes();
    authMiddleware(req, res, mockNext());
    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('AUTH_REQUIRED');
  });

  test('valid Bearer token → calls next with user', () => {
    const token = jwt.sign({ id: '1', role: 'admin', name: 'Test' }, config.jwtSecret, { issuer: 'school-ai' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('1');
    expect(req.user.role).toBe('admin');
  });

  test('valid cookie token → calls next', () => {
    const token = jwt.sign({ id: '1', role: 'admin', name: 'Test' }, config.jwtSecret, { issuer: 'school-ai' });
    const req = mockReq({ cookies: { token } });
    const res = mockRes();
    const next = mockNext();
    authMiddleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('1');
  });

  test('expired token → 401', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, config.jwtSecret, { expiresIn: '0s', issuer: 'school-ai' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    authMiddleware(req, res, mockNext());
    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('TOKEN_EXPIRED');
  });

  test('invalid token → 403', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();
    authMiddleware(req, res, mockNext());
    expect(res.statusCode).toBe(403);
    expect(res._json.code).toBe('TOKEN_INVALID');
  });

  test('Bearer takes precedence over cookie', () => {
    const bearerToken = jwt.sign({ id: '1', role: 'admin', name: 'B' }, config.jwtSecret, { issuer: 'school-ai' });
    const cookieToken = jwt.sign({ id: '2', role: 'student', name: 'C' }, config.jwtSecret, { issuer: 'school-ai' });
    const req = mockReq({ headers: { authorization: `Bearer ${bearerToken}` }, cookies: { token: cookieToken } });
    const res = mockRes();
    authMiddleware(req, res, mockNext());
    expect(req.user.id).toBe('1');
  });
});

describe('roles middleware', () => {
  test('allowed role → calls next', () => {
    const req = mockReq({ user: { role: 'admin' } });
    const res = mockRes();
    const next = mockNext();
    rolesMiddleware('admin', 'teacher')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('disallowed role → 403', () => {
    const req = mockReq({ user: { role: 'student' } });
    const res = mockRes();
    rolesMiddleware('admin', 'teacher')(req, res, mockNext());
    expect(res.statusCode).toBe(403);
    expect(res._json.code).toBe('FORBIDDEN');
  });

  test('no user → 403', () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    rolesMiddleware('admin')(req, res, mockNext());
    expect(res.statusCode).toBe(403);
  });

  test('multiple allowed roles', () => {
    const req = mockReq({ user: { role: 'teacher' } });
    const res = mockRes();
    const next = mockNext();
    rolesMiddleware('admin', 'teacher', 'head_teacher')(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('validate (Zod)', () => {
  test('loginSchema: valid → passes', () => {
    const req = mockReq({ body: { email: 'test@example.com', password: 'secret' } });
    const res = mockRes();
    const next = mockNext();
    validate(loginSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.email).toBe('test@example.com');
  });

  test('loginSchema: email normalized to lowercase', () => {
    const req = mockReq({ body: { email: 'TEST@Example.COM', password: 'secret' } });
    const res = mockRes();
    const next = mockNext();
    validate(loginSchema)(req, res, next);
    expect(req.body.email).toBe('test@example.com');
  });

  test('loginSchema: missing email → 400', () => {
    const req = mockReq({ body: { password: 'secret' } });
    const res = mockRes();
    validate(loginSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('MISSING_FIELDS');
  });

  test('loginSchema: invalid email → 400', () => {
    const req = mockReq({ body: { email: 'notanemail', password: 'secret' } });
    const res = mockRes();
    validate(loginSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_EMAIL');
  });

  test('registerSchema: valid → passes', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: 'SecurePass1', name: 'Test', role: 'student' } });
    const res = mockRes();
    const next = mockNext();
    validate(registerSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe('Test');
  });

  test('registerSchema: weak password → 400', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: '123', name: 'Test', role: 'student' } });
    const res = mockRes();
    validate(registerSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('WEAK_PASSWORD');
  });

  test('registerSchema: invalid role → 400', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: 'SecurePass1', name: 'Test', role: 'invalid' } });
    const res = mockRes();
    validate(registerSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_ROLE');
  });

  test('registerSchema: html in name is stripped', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: 'SecurePass1', name: '<script>alert(1)</script>', role: 'student' } });
    const res = mockRes();
    const next = mockNext();
    validate(registerSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe('scriptalert(1)/script');
  });

  test('createGradeSchema: valid grade', () => {
    const req = mockReq({ body: { student_id: 'abc', subject: 'Math', grade: 4 } });
    const res = mockRes();
    const next = mockNext();
    validate(createGradeSchema)(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.body.grade).toBe(4);
  });

  test('createGradeSchema: grade out of range → 400', () => {
    const req = mockReq({ body: { student_id: 'abc', subject: 'Math', grade: 6 } });
    const res = mockRes();
    validate(createGradeSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_GRADE');
  });

  test('createGradeSchema: missing student_id → 400', () => {
    const req = mockReq({ body: { subject: 'Math', grade: 4 } });
    const res = mockRes();
    validate(createGradeSchema)(req, res, mockNext());
    expect(res.statusCode).toBe(400);
  });
});

describe('errorHandler middleware', () => {
  test('unique violation (23505) → 409', () => {
    const res = mockRes();
    errorHandler({ code: '23505', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(409);
    expect(res._json.code).toBe('CONFLICT');
  });

  test('AppError with status+code → proper response', () => {
    const res = mockRes();
    errorHandler({ status: 404, code: 'NOT_FOUND', message: 'Not found', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(404);
    expect(res._json.code).toBe('NOT_FOUND');
  });

  test('ValidationError → 400', () => {
    const res = mockRes();
    errorHandler({ name: 'ValidationError', message: 'Bad', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('VALIDATION_ERROR');
  });

  test('JsonWebTokenError → 401', () => {
    const res = mockRes();
    errorHandler({ name: 'JsonWebTokenError', message: 'bad', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('TOKEN_ERROR');
  });

  test('generic error → 500', () => {
    const res = mockRes();
    errorHandler({ message: 'oops', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(500);
    expect(res._json.code).toBe('INTERNAL_ERROR');
  });

  test('generic error in dev → includes debug', () => {
    process.env.NODE_ENV = 'development';
    const res = mockRes();
    errorHandler({ message: 'oops', stack: '' }, mockReq(), res, mockNext());
    expect(res.statusCode).toBe(500);
    expect(res._json.debug).toBe('oops');
    process.env.NODE_ENV = 'test';
  });
});

describe('requireAuth factory', () => {
  test('returns array of middlewares', () => {
    const middlewares = requireAuth();
    expect(Array.isArray(middlewares)).toBe(true);
    expect(middlewares.length).toBe(2);
  });

  test('with roles returns 3 middlewares', () => {
    const middlewares = requireAuth('admin');
    expect(middlewares.length).toBe(3);
  });
});
