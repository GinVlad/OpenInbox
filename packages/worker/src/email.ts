import PostalMime from 'postal-mime';
import { Env } from './lib/db';

export async function handleEmail(message: any, env: Env): Promise<void> {
  const recipient = message.to.toLowerCase().trim();
  if (!recipient) {
    return; // silent drop
  }

  // 1. Validate against allowed EMAIL_DOMAIN list (if set)
  if (env.EMAIL_DOMAIN) {
    const allowed = env.EMAIL_DOMAIN.split(',').map((d) => d.trim().toLowerCase());
    const domainPart = recipient.split('@')[1];
    if (!domainPart || !allowed.includes(domainPart)) {
      console.log(`Email dropped: ${domainPart} not in EMAIL_DOMAIN`);
      return; // silent drop
    }
  }

  // 2. Validate inbox exists + domain enabled in DB
  const inbox = await env.DB.prepare(
    `SELECT i.id FROM inboxes i
     JOIN domains d ON d.id = i.domain_id
     WHERE i.full_email = ? AND d.enabled = 1`
  ).bind(recipient).first<{ id: string }>();

  if (!inbox) {
    console.log(`Email dropped: Inbox ${recipient} not found or domain disabled`);
    return; // silent drop
  }

  // 3. Parse content (PostalMime)
  const parser = new PostalMime();
  const rawText = await streamToString(message.raw);
  if (!rawText) {
    console.log(`Email dropped: raw body exceeds 1MB limit`);
    return; // Too large, silently drop
  }
  const parsed = await parser.parse(rawText);

  // 4. Save to DB
  await env.DB.prepare(
    `INSERT INTO messages (id, inbox_id, sender, recipient, subject, text_body, html_body, headers, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    inbox.id,
    message.from.toLowerCase().trim(),
    recipient,
    parsed.subject ?? '',
    parsed.text ?? null,
    parsed.html ?? null,
    JSON.stringify(serializeHeaders(message.headers)),
  ).run();
}

async function streamToString(stream: ReadableStream<Uint8Array>, maxBytes = 1_048_576): Promise<string | null> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let result = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      reader.cancel();
      return null; // Exceeds size limit
    }
    result += decoder.decode(value, { stream: true });
  }
  result += decoder.decode();
  return result;
}

function serializeHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}
