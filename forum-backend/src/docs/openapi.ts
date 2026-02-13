import swaggerJsdoc from 'swagger-jsdoc';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'APrism Forum API',
      version: '1.0.0',
      description: 'Phase 1-2 core API for APrism forum system',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Local development server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Service health' },
      { name: 'Auth', description: 'Authentication' },
      { name: 'Forums', description: 'Forum and category data' },
      { name: 'Threads', description: 'Thread operations' },
      { name: 'Posts', description: 'Post operations' },
      { name: 'Users', description: 'User profile operations' },
      { name: 'Points', description: 'User points and daily sign-in' },
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
        ApiSuccess: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {},
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Service is healthy',
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register a new account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['username', 'email', 'password'],
                  properties: {
                    username: { type: 'string', minLength: 3, maxLength: 50 },
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 6, maxLength: 64 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Register success' },
            '409': { description: 'Username or email already exists' },
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login with username/email and password',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['identifier', 'password'],
                  properties: {
                    identifier: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login success' },
            '401': { description: 'Invalid credentials' },
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: 'Get current user profile',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Get current user success' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/categories': {
        get: {
          tags: ['Forums'],
          summary: 'Get forum categories',
          responses: {
            '200': { description: 'Category list' },
          },
        },
      },
      '/api/forums': {
        get: {
          tags: ['Forums'],
          summary: 'Get forums',
          responses: {
            '200': { description: 'Forum list' },
          },
        },
      },
      '/api/forums/{id}': {
        get: {
          tags: ['Forums'],
          summary: 'Get forum detail',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Forum detail' },
            '404': { description: 'Forum not found' },
          },
        },
      },
      '/api/forums/{id}/threads': {
        get: {
          tags: ['Forums'],
          summary: 'Get thread list in forum',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 20 },
            },
          ],
          responses: {
            '200': { description: 'Paginated thread list' },
            '404': { description: 'Forum not found' },
          },
        },
      },
      '/api/threads': {
        post: {
          tags: ['Threads'],
          summary: 'Create thread',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['forumId', 'title', 'content'],
                  properties: {
                    forumId: { type: 'integer', minimum: 1 },
                    title: { type: 'string', minLength: 3, maxLength: 255 },
                    content: { type: 'string', minLength: 1, maxLength: 20000 },
                    type: { type: 'string', default: 'normal' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Thread created' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/threads/{id}': {
        get: {
          tags: ['Threads'],
          summary: 'Get thread detail',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thread detail' },
            '404': { description: 'Thread not found' },
          },
        },
        put: {
          tags: ['Threads'],
          summary: 'Update thread',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thread updated' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Thread not found' },
          },
        },
        delete: {
          tags: ['Threads'],
          summary: 'Delete thread',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Thread deleted' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Thread not found' },
          },
        },
      },
      '/api/threads/{id}/posts': {
        get: {
          tags: ['Posts'],
          summary: 'Get posts in thread',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 20 },
            },
          ],
          responses: {
            '200': { description: 'Paginated post list' },
            '404': { description: 'Thread not found' },
          },
        },
      },
      '/api/posts': {
        post: {
          tags: ['Posts'],
          summary: 'Create post',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['threadId', 'content'],
                  properties: {
                    threadId: { type: 'integer', minimum: 1 },
                    content: { type: 'string', minLength: 1, maxLength: 10000 },
                    parentId: { type: 'integer', minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Post created' },
            '400': { description: 'Thread locked' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Thread or parent post not found' },
          },
        },
      },
      '/api/posts/{id}/like': {
        post: {
          tags: ['Posts'],
          summary: 'Like a post',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Like success' },
            '404': { description: 'Post not found' },
          },
        },
      },
      '/api/users/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Get user public profile',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Public profile' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/users/me': {
        put: {
          tags: ['Users'],
          summary: 'Update current user profile',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    avatar: { type: 'string', minLength: 3, maxLength: 500 },
                    bio: { type: 'string', maxLength: 500 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Profile updated' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/points/me/summary': {
        get: {
          tags: ['Points'],
          summary: 'Get current user points summary',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Points summary' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/points/me/logs': {
        get: {
          tags: ['Points'],
          summary: 'Get current user points logs',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            '200': { description: 'Points logs' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/points/me/signin': {
        post: {
          tags: ['Points'],
          summary: 'Daily sign-in for points',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Sign-in success' },
            '401': { description: 'Unauthorized' },
            '409': { description: 'Already signed in today' },
          },
        },
      },
    },
  },
  apis: [],
};

export const openApiSpec = swaggerJsdoc(swaggerOptions);
