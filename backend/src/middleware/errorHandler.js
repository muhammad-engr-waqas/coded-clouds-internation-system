export const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ message: `${field} already exists` });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Multer errors
  if (err.name === 'MulterError' || err.message?.includes('Unsupported file type')) {
    return res.status(400).json({ message: err.message });
  }

  const statusCode = err.statusCode || res.statusCode !== 200 ? res.statusCode : 500;
  res.status(statusCode || 500).json({ message: err.message || 'Server error' });
};
