import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import ApiError from './ApiError.js';

// Promisify jwt.sign
const signJwt = promisify(jwt.sign);

/**
 * Generate JWT token
 * @param   {Object} payload - Payload to sign
 * @param   {String} secret - Secret key
 * @param   {Object} options - JWT options
 * @return  {Promise<String>} Signed token
 */
const generateToken = async (payload, secret, options) => {
  try {
    return await signJwt(payload, secret, options);
  } catch (error) {
    throw new ApiError('Error generating token', 500);
  }
};

/**
 * Generate access token
 * @param   {String} userId - User ID
 * @return  {Promise<String>} Access token
 */
export const generateAccessToken = (userId) => {
  return generateToken(
    { id: userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token
 * @param   {String} userId - User ID
 * @return  {Promise<String>} Refresh token
 */
export const generateRefreshToken = (userId) => {
  return generateToken(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate email verification token
 * @param   {String} userId - User ID
 * @return  {Promise<String>} Email verification token
 */
export const generateEmailVerificationToken = (userId) => {
  return generateToken(
    { id: userId },
    process.env.JWT_EMAIL_VERIFICATION_SECRET,
    { expiresIn: process.env.JWT_EMAIL_VERIFICATION_EXPIRES_IN || '1d' }
  );
};

/**
 * Generate password reset token
 * @param   {String} userId - User ID
 * @return  {Promise<String>} Password reset token
 */
export const generatePasswordResetToken = (userId) => {
  return generateToken(
    { id: userId },
    process.env.JWT_PASSWORD_RESET_SECRET,
    { expiresIn: process.env.JWT_PASSWORD_RESET_EXPIRES_IN || '10m' }
  );
};

/**
 * Verify JWT token
 * @param   {String} token - JWT token
 * @param   {String} secret - Secret key
 * @return  {Promise<Object>} Decoded token
 */
export const verifyToken = async (token, secret) => {
  try {
    return await promisify(jwt.verify)(token, secret);
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      throw new ApiError('Token has expired', 401);
    }
    throw new ApiError('Error verifying token', 500);
  }
};

/**
 * Create and send JWT token
 * @param   {Object} user - User object
 * @param   {Number} statusCode - HTTP status code
 * @param   {Object} res - Express response object
 * @return  {void}
 */
export const createAndSendToken = async (user, statusCode, res) => {
  try {
    // 1) Generate tokens
    const accessToken = await generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // 2) Set refresh token in HTTP-only cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: 'strict',
    };

    // 3) Remove password from output
    user.password = undefined;

    // 4) Send response
    res.status(statusCode).json({
      status: 'success',
      token: accessToken,
      data: {
        user,
      },
    });

    // 5) Set refresh token in cookie
    res.cookie('refreshToken', refreshToken, cookieOptions);
  } catch (error) {
    throw new ApiError('Error creating token', 500);
  }
};

/**
 * Clear JWT token cookie
 * @param   {Object} res - Express response object
 * @return  {void}
 */
export const clearTokenCookie = (res) => {
  res.cookie('refreshToken', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
  });
};
