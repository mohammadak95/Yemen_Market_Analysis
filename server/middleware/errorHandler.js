// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }
  
    if (err.status === 404 || err.statusCode === 404) {
      return res.status(404).json({
        error: 'Resource not found',
        message: 'The requested resource could not be found',
        path: req.path
      });
    }
  
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
  
  module.exports = errorHandler;