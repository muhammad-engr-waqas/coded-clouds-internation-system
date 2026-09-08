/**
 * Restricts a route to a specific set of roles.
 * Usage: router.post('/', protect, allowRoles('Admin', 'HR'), controllerFn)
 */
export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access denied. Requires role: ${roles.join(' or ')}` });
    }
    next();
  };
};

export const isAdmin = (req, res, next) => allowRoles('Admin')(req, res, next);
export const isAdminOrHR = (req, res, next) => allowRoles('Admin', 'HR')(req, res, next);
