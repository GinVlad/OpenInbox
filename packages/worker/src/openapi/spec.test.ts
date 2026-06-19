import { describe, it, expect } from 'vitest';
import { openApiSpec } from './spec';

describe('OpenAPI spec', () => {
  it('is OpenAPI 3.1', () => {
    expect(openApiSpec.openapi).toBe('3.1.0');
  });

  it('documents all main endpoint groups', () => {
    expect(openApiSpec.paths['/domains']).toBeDefined();
    expect(openApiSpec.paths['/inboxes']).toBeDefined();
    expect(openApiSpec.paths['/messages']).toBeDefined();
    expect(openApiSpec.paths['/search']).toBeDefined();
    expect(openApiSpec.paths['/auth/login']).toBeDefined();
  });

  it('includes bearer and cookie auth schemes', () => {
    expect(openApiSpec.components.securitySchemes.bearerAuth).toBeDefined();
    expect(openApiSpec.components.securitySchemes.cookieAuth).toBeDefined();
  });
});
