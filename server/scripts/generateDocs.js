require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Connect-PRO API Documentation',
    version: '1.0.0',
    description: 'API documentation for Connect-PRO - A professional networking platform',
    contact: {
      name: 'Connect-PRO Support',
      email: 'support@connectpro.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:5000/api',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the user',
            example: '60d0fe4f5311236168a109ca',
          },
          name: {
            type: 'string',
            description: 'User\'s full name',
            example: 'John Doe',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User\'s email address',
            example: 'john.doe@example.com',
          },
          role: {
            type: 'string',
            enum: ['user', 'recruiter', 'admin'],
            default: 'user',
            description: 'User\'s role',
          },
          profile: {
            $ref: '#/components/schemas/Profile',
          },
          isEmailVerified: {
            type: 'boolean',
            default: false,
            description: 'Whether the user has verified their email',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when the user was created',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Date when the user was last updated',
          },
        },
      },
      Profile: {
        type: 'object',
        properties: {
          headline: {
            type: 'string',
            description: 'User\'s professional headline',
            example: 'Senior Software Engineer at Tech Corp',
          },
          company: {
            type: 'string',
            description: 'User\'s current company',
            example: 'Tech Corp',
          },
          location: {
            type: 'string',
            description: 'User\'s location',
            example: 'San Francisco, CA',
          },
          about: {
            type: 'string',
            description: 'User\'s bio/about section',
          },
          skills: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of user\'s skills',
            example: ['JavaScript', 'React', 'Node.js'],
          },
          experience: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Experience',
            },
          },
          education: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Education',
            },
          },
          social: {
            $ref: '#/components/schemas/Social',
          },
        },
      },
      Experience: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Job title',
            example: 'Senior Software Engineer',
          },
          company: {
            type: 'string',
            description: 'Company name',
            example: 'Tech Corp',
          },
          location: {
            type: 'string',
            description: 'Job location',
            example: 'San Francisco, CA',
          },
          from: {
            type: 'string',
            format: 'date',
            description: 'Start date',
          },
          to: {
            type: 'string',
            format: 'date',
            description: 'End date (null if current)',
          },
          current: {
            type: 'boolean',
            default: false,
            description: 'Whether this is the current position',
          },
          description: {
            type: 'string',
            description: 'Job description',
          },
        },
      },
      Education: {
        type: 'object',
        properties: {
          school: {
            type: 'string',
            description: 'School/University name',
            example: 'Stanford University',
          },
          degree: {
            type: 'string',
            description: 'Degree obtained',
            example: 'Master of Science',
          },
          fieldOfStudy: {
            type: 'string',
            description: 'Field of study',
            example: 'Computer Science',
          },
          from: {
            type: 'string',
            format: 'date',
            description: 'Start date',
          },
          to: {
            type: 'string',
            format: 'date',
            description: 'End date (null if current)',
          },
          current: {
            type: 'boolean',
            default: false,
            description: 'Whether currently studying',
          },
          description: {
            type: 'string',
            description: 'Additional information',
          },
        },
      },
      Social: {
        type: 'object',
        properties: {
          website: {
            type: 'string',
            format: 'uri',
            description: 'Personal website URL',
          },
          linkedin: {
            type: 'string',
            description: 'LinkedIn profile URL or username',
          },
          github: {
            type: 'string',
            description: 'GitHub profile URL or username',
          },
          twitter: {
            type: 'string',
            description: 'Twitter profile URL or username',
          },
        },
      },
      Post: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the post',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          text: {
            type: 'string',
            description: 'Post content',
          },
          image: {
            type: 'string',
            description: 'URL to the post image',
          },
          likes: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User',
            },
            description: 'List of users who liked the post',
          },
          comments: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Comment',
            },
          },
          shares: {
            type: 'number',
            default: 0,
            description: 'Number of times the post was shared',
          },
          isShared: {
            type: 'boolean',
            default: false,
            description: 'Whether this is a shared post',
          },
          originalPost: {
            $ref: '#/components/schemas/Post',
            description: 'Original post if this is a shared post',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Comment: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the comment',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          text: {
            type: 'string',
            description: 'Comment content',
          },
          likes: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User',
            },
            description: 'List of users who liked the comment',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Job: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the job',
          },
          title: {
            type: 'string',
            description: 'Job title',
            example: 'Senior Software Engineer',
          },
          company: {
            type: 'string',
            description: 'Company name',
            example: 'Tech Corp',
          },
          location: {
            type: 'string',
            description: 'Job location',
            example: 'San Francisco, CA',
          },
          type: {
            type: 'string',
            enum: ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship', 'Volunteer'],
            description: 'Job type',
          },
          salary: {
            $ref: '#/components/schemas/Salary',
          },
          description: {
            type: 'string',
            description: 'Job description',
          },
          requirements: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of job requirements',
          },
          responsibilities: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of job responsibilities',
          },
          skills: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of required skills',
          },
          postedBy: {
            $ref: '#/components/schemas/User',
          },
          status: {
            type: 'string',
            enum: ['draft', 'published', 'closed', 'filled'],
            default: 'draft',
            description: 'Job status',
          },
          applications: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/JobApplication',
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Salary: {
        type: 'object',
        properties: {
          min: {
            type: 'number',
            description: 'Minimum salary',
          },
          max: {
            type: 'number',
            description: 'Maximum salary',
          },
          currency: {
            type: 'string',
            default: 'USD',
            description: 'Currency code (ISO 4217)',
          },
          period: {
            type: 'string',
            enum: ['hour', 'day', 'week', 'month', 'year'],
            default: 'year',
            description: 'Salary period',
          },
        },
      },
      JobApplication: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the application',
          },
          user: {
            $ref: '#/components/schemas/User',
          },
          resume: {
            type: 'string',
            description: 'URL to the resume file',
          },
          coverLetter: {
            type: 'string',
            description: 'Cover letter text',
          },
          status: {
            type: 'string',
            enum: ['pending', 'reviewing', 'interviewing', 'offered', 'hired', 'rejected'],
            default: 'pending',
            description: 'Application status',
          },
          notes: {
            type: 'string',
            description: 'Internal notes about the application',
          },
          appliedAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Conversation: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the conversation',
          },
          participants: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User',
            },
            description: 'List of participants in the conversation',
          },
          isGroup: {
            type: 'boolean',
            default: false,
            description: 'Whether this is a group conversation',
          },
          groupInfo: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Group name',
              },
              admin: {
                $ref: '#/components/schemas/User',
              },
              image: {
                type: 'string',
                description: 'URL to the group image',
              },
            },
          },
          lastMessage: {
            $ref: '#/components/schemas/Message',
          },
          unreadCount: {
            type: 'number',
            default: 0,
            description: 'Number of unread messages',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Message: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the message',
          },
          conversation: {
            $ref: '#/components/schemas/Conversation',
          },
          sender: {
            $ref: '#/components/schemas/User',
          },
          content: {
            type: 'string',
            description: 'Message content',
          },
          attachments: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'List of attachment URLs',
          },
          readBy: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/User',
            },
            description: 'List of users who have read the message',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: {
            type: 'string',
            description: 'The auto-generated id of the notification',
          },
          recipient: {
            $ref: '#/components/schemas/User',
          },
          sender: {
            $ref: '#/components/schemas/User',
          },
          type: {
            type: 'string',
            enum: [
              'connection_request',
              'connection_accepted',
              'post_like',
              'post_comment',
              'post_share',
              'job_application',
              'job_application_update',
              'message',
              'mention',
              'system',
            ],
            description: 'Type of notification',
          },
          message: {
            type: 'string',
            description: 'Notification message',
          },
          link: {
            type: 'string',
            description: 'URL to redirect to when clicked',
          },
          isRead: {
            type: 'boolean',
            default: false,
            description: 'Whether the notification has been read',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            default: false,
          },
          message: {
            type: 'string',
            description: 'Error message',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                msg: {
                  type: 'string',
                  description: 'Error message',
                },
                param: {
                  type: 'string',
                  description: 'Parameter that caused the error',
                },
                location: {
                  type: 'string',
                  description: 'Location of the error (body, params, query, etc.)',
                },
              },
            },
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Access token is missing or invalid',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              message: 'Not authorized to access this route',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              message: 'Resource not found',
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              message: 'Validation failed',
              errors: [
                {
                  msg: 'Name is required',
                  param: 'name',
                  location: 'body',
                },
              ],
            },
          },
        },
      },
    },
    parameters: {
      pageParam: {
        in: 'query',
        name: 'page',
        schema: {
          type: 'integer',
          default: 1,
          minimum: 1,
        },
        description: 'Page number',
      },
      limitParam: {
        in: 'query',
        name: 'limit',
        schema: {
          type: 'integer',
          default: 10,
          minimum: 1,
          maximum: 100,
        },
        description: 'Number of items per page',
      },
      sortParam: {
        in: 'query',
        name: 'sort',
        schema: {
          type: 'string',
          default: '-createdAt',
        },
        description: 'Sort by field. Prefix with - for descending order',
      },
      searchParam: {
        in: 'query',
        name: 'search',
        schema: {
          type: 'string',
        },
        description: 'Search term',
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentication and user management',
    },
    {
      name: 'Users',
      description: 'User profiles and connections',
    },
    {
      name: 'Posts',
      description: 'User posts and interactions',
    },
    {
      name: 'Jobs',
      description: 'Job postings and applications',
    },
    {
      name: 'Messages',
      description: 'Private messaging between users',
    },
    {
      name: 'Notifications',
      description: 'User notifications',
    },
  ],
};

// Options for the swagger-jsdoc
const options = {
  swaggerDefinition,
  // Paths to files containing OpenAPI definitions
  apis: [
    './routes/*.js',
    './controllers/*.js',
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(options);

// Save the OpenAPI specification to a file
const outputFile = path.join(__dirname, '..', 'docs', 'openapi.json');
const outputDir = path.dirname(outputFile);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2));
console.log(`OpenAPI documentation generated at: ${outputFile}`);

// Generate HTML documentation using ReDoc
const redoc = require('redoc-express');
const express = require('express');
const app = express();
const port = process.env.DOCS_PORT || 3001;

app.use(express.static('public'));

app.get(
  '/docs',
  redoc({
    title: 'Connect-PRO API Documentation',
    specUrl: '/openapi.json',
    redocOptions: {
      theme: {
        colors: {
          primary: {
            main: '#0077b5',
          },
          success: {
            main: '#00a86b',
          },
          warning: {
            main: '#ffc107',
          },
          error: {
            main: '#f44336',
          },
        },
        typography: {
          fontFamily: 'Roboto, sans-serif',
          fontSize: '14px',
          lineHeight: '1.5',
          code: {
            backgroundColor: '#f5f5f5',
            fontFamily: 'Courier New, monospace',
          },
        },
        sidebar: {
          backgroundColor: '#f5f5f5',
          width: '260px',
        },
      },
      scrollYOffset: 50,
      hideHostname: false,
      expandResponses: '200,201',
      requiredPropsFirst: true,
      noAutoAuth: true,
      pathInMiddlePanel: true,
      hideLoading: true,
      nativeScrollbars: true,
      hideDownloadButton: false,
      disableSearch: false,
      onlyRequiredInSamples: false,
    },
  })
);

app.get('/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

app.listen(port, () => {
  console.log(`API documentation available at http://localhost:${port}/docs`);
});
