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
      { name: 'Badges', description: 'Achievement badges' },
      { name: 'Notifications', description: 'User notifications' },
      { name: 'Messages', description: 'Private messages' },
      { name: 'Search', description: 'Search threads and users' },
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
      '/api/forums/{id}/moderators': {
        get: {
          tags: ['Forums'],
          summary: 'Get moderators of a forum',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Forum moderators list' },
            '404': { description: 'Forum not found' },
          },
        },
        post: {
          tags: ['Forums'],
          summary: 'Assign moderator to forum (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId'],
                  properties: {
                    userId: { type: 'integer', minimum: 1 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Moderator assigned' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Forum or user not found' },
            '409': { description: 'Moderator already assigned' },
          },
        },
      },
      '/api/forums/{id}/moderators/{userId}': {
        delete: {
          tags: ['Forums'],
          summary: 'Remove forum moderator (admin only)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
            {
              name: 'userId',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'Moderator removed' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Forum not found or assignment missing' },
          },
        },
      },
      '/api/forums/{id}/moderator-logs': {
        get: {
          tags: ['Forums'],
          summary: 'Get forum moderator action logs (admin or forum moderator)',
          security: [{ bearerAuth: [] }],
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
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            '200': { description: 'Moderator logs list' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
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
      '/api/threads/{id}/moderation': {
        patch: {
          tags: ['Threads'],
          summary: 'Update thread moderation fields (admin or forum moderator)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    isPinned: { type: 'boolean' },
                    isLocked: { type: 'boolean' },
                    isEssence: { type: 'boolean' },
                  },
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            '200': { description: 'Thread moderation updated' },
            '400': { description: 'Invalid moderation payload' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Thread not found' },
          },
        },
      },
      '/api/threads/{id}/move': {
        post: {
          tags: ['Threads'],
          summary: 'Move thread to another forum (admin or source forum moderator)',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['targetForumId'],
                  properties: {
                    targetForumId: { type: 'integer', minimum: 1 },
                  },
                  additionalProperties: false,
                },
              },
            },
          },
          responses: {
            '200': { description: 'Thread moved' },
            '400': { description: 'Invalid target forum' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Thread or target forum not found' },
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
            '200': { description: 'Like success' },
            '401': { description: 'Unauthorized' },
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
      '/api/users/{id}/follow-status': {
        get: {
          tags: ['Users'],
          summary: 'Get follow status for current user and target user',
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
            '200': { description: 'Follow status' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/users/{id}/follow': {
        post: {
          tags: ['Users'],
          summary: 'Follow a user',
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
            '200': { description: 'Followed user' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'User not found' },
          },
        },
        delete: {
          tags: ['Users'],
          summary: 'Unfollow a user',
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
            '200': { description: 'Unfollowed user' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/users/{id}/badges': {
        get: {
          tags: ['Badges'],
          summary: 'Get badges for a user',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'integer', minimum: 1 },
            },
          ],
          responses: {
            '200': { description: 'User badges' },
            '404': { description: 'User not found' },
          },
        },
      },
      '/api/badges': {
        get: {
          tags: ['Badges'],
          summary: 'Get all available badges',
          responses: {
            '200': { description: 'Badge catalog' },
          },
        },
      },
      '/api/badges/me': {
        get: {
          tags: ['Badges'],
          summary: 'Get current user badges',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Current user badges' },
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
      '/api/points/leaderboard': {
        get: {
          tags: ['Points'],
          summary: 'Get points leaderboard',
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
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['all', '7d', '30d'], default: 'all' },
            },
          ],
          responses: {
            '200': { description: 'Points leaderboard' },
          },
        },
      },
      '/api/points/signin-leaderboard': {
        get: {
          tags: ['Points'],
          summary: 'Get sign-in streak leaderboard',
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
            {
              name: 'period',
              in: 'query',
              schema: { type: 'string', enum: ['all', '7d', '30d'], default: 'all' },
            },
          ],
          responses: {
            '200': { description: 'Sign-in leaderboard' },
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
      '/api/notifications': {
        get: {
          tags: ['Notifications'],
          summary: 'Get current user notifications',
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
            {
              name: 'unreadOnly',
              in: 'query',
              schema: { type: 'boolean', default: false },
            },
          ],
          responses: {
            '200': { description: 'Notifications list' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/notifications/unread-count': {
        get: {
          tags: ['Notifications'],
          summary: 'Get current user unread notifications count',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Unread notifications count' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/notifications/settings': {
        get: {
          tags: ['Notifications'],
          summary: 'Get current user notification settings',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Notification settings' },
            '401': { description: 'Unauthorized' },
          },
        },
        put: {
          tags: ['Notifications'],
          summary: 'Update current user notification settings',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    threadReplyEnabled: { type: 'boolean' },
                    postReplyEnabled: { type: 'boolean' },
                    mentionEnabled: { type: 'boolean' },
                    postLikedEnabled: { type: 'boolean' },
                    followEnabled: { type: 'boolean' },
                    systemEnabled: { type: 'boolean' },
                    dndEnabled: { type: 'boolean' },
                    dndStartHour: { type: 'integer', minimum: 0, maximum: 23 },
                    dndEndHour: { type: 'integer', minimum: 0, maximum: 23 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Notification settings updated' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/notifications/read-all': {
        post: {
          tags: ['Notifications'],
          summary: 'Mark all current user notifications as read',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'All notifications marked as read' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/notifications/system': {
        post: {
          tags: ['Notifications'],
          summary: 'Create a system notification (admin only)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['userId', 'title'],
                  properties: {
                    userId: { type: 'integer', minimum: 1 },
                    title: { type: 'string', minLength: 1, maxLength: 255 },
                    content: { type: 'string', maxLength: 10000 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'System notification created' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
          },
        },
      },
      '/api/notifications/stream': {
        get: {
          tags: ['Notifications'],
          summary: 'Subscribe notification events via SSE',
          parameters: [
            {
              name: 'token',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'JWT token for EventSource clients',
            },
          ],
          responses: {
            '200': { description: 'SSE stream opened' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/notifications/{id}/read': {
        post: {
          tags: ['Notifications'],
          summary: 'Mark notification as read',
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
            '200': { description: 'Marked as read' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Notification not found' },
          },
        },
      },
      '/api/messages': {
        post: {
          tags: ['Messages'],
          summary: 'Send a private message',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['receiverId', 'content'],
                  properties: {
                    receiverId: { type: 'integer', minimum: 1 },
                    content: { type: 'string', minLength: 1, maxLength: 5000 },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Message sent' },
            '400': { description: 'Invalid request' },
            '401': { description: 'Unauthorized' },
            '404': { description: 'Receiver not found' },
          },
        },
      },
      '/api/messages/conversations': {
        get: {
          tags: ['Messages'],
          summary: 'Get current user conversation list',
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
            '200': { description: 'Conversation list' },
            '401': { description: 'Unauthorized' },
          },
        },
      },
      '/api/messages/conversations/{id}': {
        get: {
          tags: ['Messages'],
          summary: 'Get messages in a conversation',
          security: [{ bearerAuth: [] }],
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
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
            },
          ],
          responses: {
            '200': { description: 'Conversation messages' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Conversation not found' },
          },
        },
      },
      '/api/messages/{id}': {
        delete: {
          tags: ['Messages'],
          summary: 'Delete a message for current user',
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
            '200': { description: 'Message deleted' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Message not found' },
          },
        },
      },
      '/api/search/threads': {
        get: {
          tags: ['Search'],
          summary: 'Search visible threads',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 1, maxLength: 100 },
            },
            {
              name: 'forumId',
              in: 'query',
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
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            '200': { description: 'Thread search result' },
            '400': { description: 'Invalid query' },
          },
        },
      },
      '/api/search/users': {
        get: {
          tags: ['Search'],
          summary: 'Search users by username or bio',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: { type: 'string', minLength: 1, maxLength: 100 },
            },
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
            '200': { description: 'User search result' },
            '400': { description: 'Invalid query' },
          },
        },
      },
    },
  },
  apis: [],
};

export const openApiSpec = swaggerJsdoc(swaggerOptions);
