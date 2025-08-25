import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';

// Promisify jwt.verify
const verifyJwt = promisify(jwt.verify);

/**
 * @desc    Protect routes - verify JWT token and get user
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @return  {void}
 */
export const authenticate = async (req, res, next) => {
  try {
    // 1) Get token and check if it exists
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new ApiError('You are not logged in! Please log in to get access.', 401)
      );
    }

    // 2) Verify token
    const decoded = await verifyJwt(token, process.env.JWT_SECRET);

    // 3) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(
        new ApiError('The user belonging to this token no longer exists.', 401)
      );
    }

    // 4) Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
        new ApiError('User recently changed password! Please log in again.', 401)
      );
    }

    // GRANT ACCESS TO PROTECTED ROUTE
    req.user = currentUser;
    res.locals.user = currentUser;
    next();
  } catch (error) {
    return next(new ApiError('Invalid or expired token. Please log in again!', 401));
  }
};

/**
 * @desc    Restrict access to specific roles
 * @param   {...String} roles - Allowed roles
 * @return  {Function} Middleware function
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError(
          `User role ${req.user.role} is not authorized to access this route`,
          403
        )
      );
    }
    next();
  };
};

/**
 * @desc    Check if the authenticated user is the owner of the resource
 * @param   {String} modelName - Name of the model to check ownership against
 * @param   {String} idParam - Name of the parameter containing the resource ID
 * @return  {Function} Middleware function
 */
export const checkOwnership = (modelName, idParam = 'id') => {
  return async (req, res, next) => {
    try {
      const Model = (await import(`../models/${modelName}.js`)).default;
      const doc = await Model.findById(req.params[idParam]);

      if (!doc) {
        return next(new ApiError(`No ${modelName} found with that ID`, 404));
      }

      // Check if user is admin or the owner of the document
      if (
        doc.user &&
        doc.user.toString() !== req.user.id &&
        req.user.role !== 'admin'
      ) {
        return next(
          new ApiError(
            'You do not have permission to perform this action',
            403
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * @desc    Check if user is logged in, only for rendered pages, no errors!
 * @param   {Object} req - Express request object
 * @param   {Object} res - Express response object
 * @param   {Function} next - Express next middleware function
 * @return  {void}
 */
export const isLoggedIn = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      // 1) Verify token
      const decoded = await verifyJwt(req.cookies.jwt, process.env.JWT_SECRET);

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
    }
    next();
  } catch (err) {
    next();
  }
};
