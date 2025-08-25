import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFile } from 'fs/promises';
import ejs from 'ejs';
import { promisify } from 'util';
import config from '../config/config.js';
import ApiError from './ApiError.js';
import logger from './logger.js';

const renderFile = promisify(ejs.renderFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Email service for sending various types of emails
 */
class EmailService {
  constructor() {
    this.client = this.createTransporter();
    this.verifyConnection();
  }

  /**
   * Create email transporter
   * @returns {Object} Nodemailer transporter
   */
  createTransporter() {
    const isTestAccount = process.env.NODE_ENV === 'test';
    
    if (isTestAccount) {
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: process.env.ETHEREAL_USER,
          pass: process.env.ETHEREAL_PASS,
        },
      });
    }

    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass,
      },
      pool: true,
      maxConnections: 10,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });
  }

  /**
   * Verify email connection
   */
  async verifyConnection() {
    try {
      const isVerified = await this.client.verify();
      if (isVerified) {
        logger.info('Email server connection verified');
      }
    } catch (error) {
      logger.error('Email server connection failed:', error);
      throw new ApiError('Email service is currently unavailable', 503);
    }
  }

  /**
   * Render email template
   * @param {string} templateName - Name of the template file (without extension)
   * @param {Object} data - Data to pass to the template
   * @returns {Promise<string>} Rendered HTML
   */
  async renderTemplate(templateName, data = {}) {
    try {
      const templatePath = join(
        __dirname,
        '..',
        'views',
        'emails',
        `${templateName}.ejs`
      );

      const template = await readFile(templatePath, 'utf-8');
      return ejs.render(template, { 
        ...data, 
        year: new Date().getFullYear(),
        appName: config.app.name,
        supportEmail: config.email.support,
        clientUrl: config.clientUrl 
      });
    } catch (error) {
      logger.error(`Error rendering template ${templateName}:`, error);
      throw new ApiError('Failed to render email template', 500);
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @param {string|string[]} options.to - Recipient email(s)
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name (without .ejs)
   * @param {Object} options.context - Template context data
   * @param {string} [options.from] - Sender email
   * @param {string} [options.replyTo] - Reply-to email
   * @returns {Promise<Object>} Email info
   */
  async send({
    to,
    subject,
    template,
    context = {},
    from = `"${config.app.name}" <${config.email.from}>`,
    replyTo = config.email.replyTo,
  }) {
    try {
      const html = await this.renderTemplate(template, context);
      
      const mailOptions = {
        from,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: `[${config.app.name}] ${subject}`,
        html,
        replyTo,
        headers: {
          'X-Priority': '1', // High priority
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      };

      const info = await this.client.sendMail(mailOptions);
      logger.info(`Email sent to ${to}: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw new ApiError('Failed to send email', 500);
    }
  }

  /**
   * Send welcome email with verification link
   * @param {Object} user - User object
   * @param {string} verificationToken - Email verification token
   * @returns {Promise<Object>} Email info
   */
  async sendWelcomeEmail(user, verificationToken) {
    const verificationUrl = `${config.clientUrl}/verify-email?token=${verificationToken}`;
    
    return this.send({
      to: user.email,
      subject: 'Welcome to Connect-PRO - Verify Your Email',
      template: 'welcome',
      context: {
        name: user.name,
        verificationUrl,
        expiresIn: '24 hours',
      },
    });
  }

  /**
   * Send password reset email
   * @param {Object} user - User object
   * @param {string} resetToken - Password reset token
   * @returns {Promise<Object>} Email info
   */
  async sendPasswordResetEmail(user, resetToken) {
    const resetUrl = `${config.clientUrl}/reset-password?token=${resetToken}`;
    
    return this.send({
      to: user.email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: {
        name: user.name,
        resetUrl,
        expiresIn: '10 minutes',
      },
    });
  }

  /**
   * Send email verification success email
   * @param {Object} user - User object
   * @returns {Promise<Object>} Email info
   */
  async sendEmailVerificationSuccess(user) {
    return this.send({
      to: user.email,
      subject: 'Email Verified Successfully',
      template: 'email-verified',
      context: {
        name: user.name,
        loginUrl: `${config.clientUrl}/login`,
      },
    });
  }

  /**
   * Send connection request email
   * @param {Object} sender - User who sent the request
   * @param {Object} recipient - User who received the request
   * @returns {Promise<Object>} Email info
   */
  async sendConnectionRequest(sender, recipient) {
    const profileUrl = `${config.clientUrl}/profile/${sender._id}`;
    const connectionsUrl = `${config.clientUrl}/connections`;
    
    return this.send({
      to: recipient.email,
      subject: `${sender.name} wants to connect with you on ${config.app.name}`,
      template: 'connection-request',
      context: {
        senderName: sender.name,
        recipientName: recipient.name,
        profileUrl,
        connectionsUrl,
      },
    });
  }

  /**
   * Send new message notification email
   * @param {Object} sender - User who sent the message
   * @param {Object} recipient - User who received the message
   * @param {string} messagePreview - Preview of the message content
   * @returns {Promise<Object>} Email info
   */
  async sendNewMessageNotification(sender, recipient, messagePreview) {
    const messageUrl = `${config.clientUrl}/messages/${sender._id}`;
    
    return this.send({
      to: recipient.email,
      subject: `New message from ${sender.name}`,
      template: 'new-message',
      context: {
        senderName: sender.name,
        recipientName: recipient.name,
        messagePreview: messagePreview.substring(0, 140) + (messagePreview.length > 140 ? '...' : ''),
        messageUrl,
      },
    });
  }

  /**
   * Send job application confirmation email
   * @param {Object} user - User who applied
   * @param {Object} job - Job details
   * @param {string} applicationId - Application ID
   * @returns {Promise<Object>} Email info
   */
  async sendJobApplicationConfirmation(user, job, applicationId) {
    const applicationUrl = `${config.clientUrl}/jobs/applications/${applicationId}`;
    
    return this.send({
      to: user.email,
      subject: `Application Submitted: ${job.title}`,
      template: 'job-application-confirmation',
      context: {
        name: user.name,
        jobTitle: job.title,
        companyName: job.company.name,
        applicationUrl,
      },
    });
  }
}

// Create and export a singleton instance
export default new EmailService();
