process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_jest_only';

const jwt = require('jsonwebtoken');
const config = require('../config/auth');

const authMiddleware = require('../middleware/auth');
const rolesMiddleware = require('../middleware/roles');
const validate = require('../middleware/validate');
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
    const token = jwt.sign({ id: '1', role: 'admin' }, config.jwtSecret);
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = mockRes();
    const next = mockNext();

    authMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe('1');
    expect(req.user.role).toBe('admin');
  });

  test('expired token → 401', () => {
    const token = jwt.sign({ id: '1', role: 'admin' }, config.jwtSecret, { expiresIn: '0s' });
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

describe('validate middleware', () => {
  test('requiredFields: all present → next', () => {
    const req = mockReq({ body: { a: 1, b: 2 } });
    const res = mockRes();
    const next = mockNext();

    validate.requiredFields('a', 'b')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('requiredFields: missing field → 400', () => {
    const req = mockReq({ body: { a: 1 } });
    const res = mockRes();
    const next = mockNext();

    validate.requiredFields('a', 'b')(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('MISSING_FIELDS');
  });

  test('requiredFields: null value → 400', () => {
    const req = mockReq({ body: { a: null } });
    const res = mockRes();
    const next = mockNext();

    validate.requiredFields('a')(req, res, next);

    expect(res.statusCode).toBe(400);
  });

  test('requiredFields: empty string → 400', () => {
    const req = mockReq({ body: { a: '' } });
    const res = mockRes();
    const next = mockNext();

    validate.requiredFields('a')(req, res, next);

    expect(res.statusCode).toBe(400);
  });

  test('validateEmail: valid email → next', () => {
    const req = mockReq({ body: { email: 'test@example.com' } });
    const res = mockRes();
    const next = mockNext();

    validate.validateEmail(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('validateEmail: invalid email → 400', () => {
    const req = mockReq({ body: { email: 'invalid' } });
    const res = mockRes();
    const next = mockNext();

    validate.validateEmail(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_EMAIL');
  });

  test('validatePassword: strong password → next', () => {
    const req = mockReq({ body: { password: '123456' } });
    const res = mockRes();
    const next = mockNext();

    validate.validatePassword(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('validatePassword: weak password → 400', () => {
    const req = mockReq({ body: { password: '123' } });
    const res = mockRes();
    const next = mockNext();

    validate.validatePassword(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('WEAK_PASSWORD');
  });

  test('validatePassword: newPassword field → next', () => {
    const req = mockReq({ body: { newPassword: '123456' } });
    const res = mockRes();
    const next = mockNext();

    validate.validatePassword(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('validateRole: allowed role → next', () => {
    const req = mockReq({ body: { role: 'student' } });
    const res = mockRes();
    const next = mockNext();

    validate.validateRole(['student', 'parent'])(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('validateRole: disallowed role → 400', () => {
    const req = mockReq({ body: { role: 'admin' } });
    const res = mockRes();
    const next = mockNext();

    validate.validateRole(['student', 'parent'])(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_ROLE');
  });

  test('validateGrade: valid grade → next', () => {
    const req = mockReq({ body: { grade: 4 } });
    const res = mockRes();
    const next = mockNext();

    validate.validateGrade(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('validateGrade: invalid grade → 400', () => {
    const req = mockReq({ body: { grade: 6 } });
    const res = mockRes();
    const next = mockNext();

    validate.validateGrade(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(res._json.code).toBe('INVALID_GRADE');
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
