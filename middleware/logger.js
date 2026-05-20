// middleware/logger.js
module.exports = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString(),
    };
    
    if (res.statusCode >= 400) {
      console.warn('⚠️', JSON.stringify(log));
    } else {
      console.log('✅', JSON.stringify(log));
    }
  });
  
  next();
};