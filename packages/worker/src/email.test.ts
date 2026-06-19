import { describe, it, expect, vi } from 'vitest';
import { handleEmail } from './email';

function createMockDB() {
  return {
    prepare: vi.fn().mockReturnThis(),
    bind: vi.fn().mockReturnThis(),
    first: vi.fn(),
    run: vi.fn().mockResolvedValue({ success: true }),
  } as any;
}

function createMockMessage(from: string, to: string, body = 'Subject: Test\n\nHello') {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(body));
      controller.close();
    },
  });
  return {
    from,
    to,
    headers: new Headers({ 'From': from, 'To': to }),
    raw: stream,
    rawSize: 100,
  };
}

describe('handleEmail', () => {
  it('silently drops if recipient empty', async () => {
    const db = createMockDB();
    const msg = createMockMessage('a@b.com', '');
    await handleEmail(msg, { DB: db, EMAIL_DOMAIN: undefined });
    expect(db.first).not.toHaveBeenCalled();
  });

  it('drops email to domain not in EMAIL_DOMAIN', async () => {
    const db = createMockDB();
    const msg = createMockMessage('a@b.com', 'test@evil.com');
    await handleEmail(msg, { DB: db, EMAIL_DOMAIN: 'example.com,test.com' });
    expect(db.first).not.toHaveBeenCalled();
  });

  it('allows email to matching EMAIL_DOMAIN', async () => {
    const db = createMockDB();
    db.first.mockResolvedValue({ id: 'i1' });
    const msg = createMockMessage('a@b.com', 'test@example.com');
    await handleEmail(msg, { DB: db, EMAIL_DOMAIN: 'example.com,test.com' });
    expect(db.first).toHaveBeenCalled();
  });

  it('drops email if inbox not found in DB', async () => {
    const db = createMockDB();
    db.first.mockResolvedValue(null);
    const msg = createMockMessage('a@b.com', 'test@example.com');
    await handleEmail(msg, { DB: db, EMAIL_DOMAIN: 'example.com' });
    expect(db.run).not.toHaveBeenCalled();
  });

  it('stores valid email', async () => {
    const db = createMockDB();
    db.first.mockResolvedValue({ id: 'i1' });
    const msg = createMockMessage('a@b.com', 'test@example.com');
    await handleEmail(msg, { DB: db, EMAIL_DOMAIN: 'example.com' });
    expect(db.prepare).toHaveBeenCalled();
    expect(db.run).toHaveBeenCalled();
  });
});
