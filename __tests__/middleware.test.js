process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';

const jwt = require('jsonwebtoken');
const config = require('../config/auth');
const { z } = require('zod');

const authMiddleware = require('../middleware/auth');
const rolesMiddleware = require('../middleware/roles');
const { validate, loginSchema, registerSchema, createGradeSchema } = require('../middleware/validate');
const errorHandler = require('../middleware/errorHandler');

function mockReq(resObj = {}) {
  return {
    headers: {},
    body: {},
    query: {},
    params: {},
    method: 'GET',
    path: '/test',
    ip: '127.0.0.1',
    user: null,
    ...resObj,
  };
}

function mockRes() {
  return {
    statusCode: 200,
    _json: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this._json = data;
      return this;
    },
  };
}

function mockNext() {
  return jest.fn();
}

describe('auth middleware', () => {
  test('no token → 401', () => {
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('AUTH_REQUIRED');
    expect(next).not.toHaveBeenCalled();
  });

  test('valid token → calls next', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, config.jwtSecret, { issuer: 'school-ai' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('1');
    expect(req.user.role).toBe('admin');
  });

  test('expired token → 401', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, config.jwtSecret, { expiresIn: '0s', issuer: 'school-ai' });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('TOKEN_EXPIRED');
  });

  test('invalid token → 403', () => {
    const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res._json.code).toBe('TOKEN_INVALID');
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
    const next = mockNext();

    rolesMiddleware('admin', 'teacher')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res._json.code).toBe('FORBIDDEN');
  });

  test('no user → 403', () => {
    const req = mockReq({ user: null });
    const res = mockRes();
    const next = mockNext();

    rolesMiddleware('admin')(req, res, next);

    expect(res.statusCode).toBe(403);
  });
});

describe('validate (Zod)', () => {
  test('loginSchema: valid → passes through', () => {
    const req = mockReq({ body: { email: 'test@example.com', password: 'secret' } });
    const res = mockRes();
    const next = mockNext();

    validate(loginSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.email).toBe('test@example.com');
  });

  test('loginSchema: missing email → 400', () => {
    const req = mockReq({ body: { password: 'secret' } });
    const res = mockRes();
    const next = mockNext();

    validate(loginSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('MISSING_FIELDS');
  });

  test('loginSchema: invalid email → 400', () => {
    const req = mockReq({ body: { email: 'notanemail', password: 'secret' } });
    const res = mockRes();
    const next = mockNext();

    validate(loginSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_EMAIL');
  });

  test('loginSchema: weak password is allowed (only min 1 char)', () => {
    const req = mockReq({ body: { email: 'test@test.com', password: 'a' } });
    const res = mockRes();
    const next = mockNext();

    validate(loginSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
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
    const next = mockNext();

    validate(registerSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('WEAK_PASSWORD');
  });

  test('registerSchema: invalid role → 400', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: 'SecurePass1', name: 'Test', role: 'invalid' } });
    const res = mockRes();
    const next = mockNext();

    validate(registerSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_ROLE');
  });

  test('registerSchema: html in name is sanitized', () => {
    const req = mockReq({ body: { email: 'new@test.com', password: 'SecurePass1', name: '<script>alert(1)</script>', role: 'student' } });
    const res = mockRes();
    const next = mockNext();

    validate(registerSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.name).toBe('scriptalert(1)/script'); // Zod transform strips <>
  });
});

describe('validateGrade with Zod', () => {
  test('valid grade → calls next', () => {
    const req = mockReq({ body: { student_id: 'abc', subject: 'Math', grade: 4 } });
    const res = mockRes();
    const next = mockNext();

    validate(createGradeSchema)(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body.grade).toBe(4);
  });

  test('invalid grade out of range → 400', () => {
    const req = mockReq({ body: { student_id: 'abc', subject: 'Math', grade: 6 } });
    const res = mockRes();
    const next = mockNext();

    validate(createGradeSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_GRADE');
  });

  test('missing student_id → 400', () => {
    const req = mockReq({ body: { subject: 'Math', grade: 4 } });
    const res = mockRes();
    const next = mockNext();

    validate(createGradeSchema)(req, res, next);

    expect(res.statusCode).toBe(400);
  });
});

describe('errorHandler middleware', () => {
  test('unique violation (23505) → 409', () => {
    const err = { code: '23505', stack: 'test' };
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(409);
    expect(res._json.code).toBe('CONFLICT');
  });

  test('ValidationError → 400', () => {
    const err = { name: 'ValidationError', message: 'Bad data', stack: 'test' };
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('VALIDATION_ERROR');
  });

  test('JsonWebTokenError → 401', () => {
    const err = { name: 'JsonWebTokenError', message: 'bad token', stack: 'test' };
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res._json.code).toBe('TOKEN_ERROR');
  });

  test('generic error → 500', () => {
    const err = { message: 'Something broke', stack: 'test' };
    const req = mockReq();
    const res = mockRes();
    const next = mockNext();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res._json.code).toBe('INTERNAL_ERROR');
  });
});
