export const errorMiddleware = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Something went wrong.';

  console.error(error);
  res.status(statusCode).json({ message });
};

