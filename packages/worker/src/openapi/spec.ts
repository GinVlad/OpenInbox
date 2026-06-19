export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'OpenInbox API',
    version: '0.1.0',
    description: 'Internal API for personal disposable email system. Single-user. No public access.',
  },
  servers: [{ url: '/api' }],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API_KEY env var. Use for scripts/automation.',
      },
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'session',
        description: 'Signed session cookie set by /api/auth/login. Use for web UI.',
      },
    },
    schemas: {
      Domain: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'example.com' },
          enabled: { type: 'integer', enum: [0, 1] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Inbox: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'amazon' },
          domain_id: { type: 'string', format: 'uuid' },
          full_email: { type: 'string', example: 'amazon@example.com' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      Message: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          inbox_id: { type: 'string', format: 'uuid' },
          sender: { type: 'string', example: 'noreply@amazon.com' },
          recipient: { type: 'string', example: 'amazon@example.com' },
          subject: { type: 'string' },
          text_body: { type: 'string', nullable: true },
          html_body: { type: 'string', nullable: true },
          headers: { type: 'string', nullable: true, description: 'JSON-encoded headers' },
          is_read: { type: 'integer', enum: [0, 1] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      PaginatedMessages: {
        type: 'object',
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/Message' } },
          nextCursor: { type: 'string', nullable: true, description: 'Pass as ?cursor= to get next page' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'object' },
          retryAfter: { type: 'integer', description: 'Seconds until rate limit resets (429 only)' },
        },
      },
    },
  },
  paths: {
    '/domains': {
      get: {
        operationId: 'listDomains',
        summary: 'List all domains',
        responses: {
          '200': {
            description: 'OK',
            content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Domain' } } } } } },
          },
        },
      },
      post: {
        operationId: 'createDomain',
        summary: 'Create a domain',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name'], properties: { name: { type: 'string', example: 'example.com' } } } } },
        },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Domain' } } } },
          '409': { description: 'Domain already exists', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/domains/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      patch: {
        operationId: 'updateDomain',
        summary: 'Enable or disable a domain',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['enabled'], properties: { enabled: { type: 'integer', enum: [0, 1] } } } } },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Domain' } } } },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        operationId: 'deleteDomain',
        summary: 'Delete a domain and all its inboxes/messages',
        responses: {
          '200': { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/inboxes': {
      get: {
        operationId: 'listInboxes',
        summary: 'List inboxes',
        parameters: [{ name: 'domainId', in: 'query', schema: { type: 'string' }, description: 'Filter by domain' }],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Inbox' } } } } } } },
        },
      },
      post: {
        operationId: 'createInbox',
        summary: 'Create an inbox',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'domainId'], properties: { name: { type: 'string', pattern: '^[a-z0-9._-]+$', minLength: 3, maxLength: 64 }, domainId: { type: 'string', format: 'uuid' } } } } },
        },
        responses: {
          '201': { description: 'Created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Inbox' } } } },
          '400': { description: 'Invalid name or domain disabled' },
          '404': { description: 'Domain not found' },
          '409': { description: 'Inbox already exists' },
        },
      },
    },
    '/inboxes/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      delete: {
        operationId: 'deleteInbox',
        summary: 'Delete an inbox and all its messages',
        responses: {
          '200': { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/messages': {
      get: {
        operationId: 'listMessages',
        summary: 'List messages (paginated)',
        parameters: [
          { name: 'inboxId', in: 'query', schema: { type: 'string' }, description: 'Filter by inbox' },
          { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Pagination cursor (created_at from last item)' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 100 } },
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/PaginatedMessages' } } } },
        },
      },
    },
    '/messages/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'getMessage',
        summary: 'Get a single message',
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        operationId: 'updateMessageRead',
        summary: 'Mark message read or unread',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['isRead'], properties: { isRead: { type: 'integer', enum: [0, 1] } } } } },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Message' } } } },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        operationId: 'deleteMessage',
        summary: 'Delete a message',
        responses: {
          '200': { description: 'Deleted', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } } },
          '404': { description: 'Not found' },
        },
      },
    },
    '/search': {
      get: {
        operationId: 'searchMessages',
        summary: 'Search messages (LIKE match)',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search term (matches sender, subject, recipient)' },
          { name: 'inboxId', in: 'query', schema: { type: 'string' }, description: 'Optional inbox filter' },
        ],
        responses: {
          '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Message' } } } } } } },
          '400': { description: 'Missing q parameter' },
        },
      },
    },
    '/auth/login': {
      post: {
        operationId: 'login',
        summary: 'Login with password (get session cookie)',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['password'], properties: { password: { type: 'string' } } } } },
        },
        responses: {
          '200': { description: 'OK — sets session cookie', headers: { 'Set-Cookie': { schema: { type: 'string' } } } },
          '401': { description: 'Invalid password' },
        },
      },
    },
  },
};
