import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export interface Domain {
  id: string;
  name: string;
  enabled: number;
  created_at: string;
}

export interface Inbox {
  id: string;
  name: string;
  domain_id: string;
  full_email: string;
  created_at: string;
}

export interface Message {
  id: string;
  inbox_id: string;
  sender: string;
  recipient: string;
  subject: string;
  text_body: string | null;
  html_body: string | null;
  headers: string | null;
  is_read: number;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
}

// Auth
export async function login(password: string): Promise<void> {
  await api.post('/auth/login', { password });
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await api.get('/domains');
    return res.status === 200;
  } catch {
    return false;
  }
}

// Domains
export async function getDomains(): Promise<Domain[]> {
  const res = await api.get<{ data: Domain[] }>('/domains');
  return res.data.data;
}

export async function createDomain(name: string): Promise<Domain> {
  const res = await api.post<{ data: Domain }>('/domains', { name });
  return res.data.data;
}

export async function updateDomain(id: string, enabled: number): Promise<Domain> {
  const res = await api.patch<{ data: Domain }>(`/domains/${id}`, { enabled });
  return res.data.data;
}

export async function deleteDomain(id: string): Promise<void> {
  await api.delete(`/domains/${id}`);
}

// Inboxes
export async function getInboxes(domainId?: string): Promise<Inbox[]> {
  const params = domainId ? { domainId } : {};
  const res = await api.get<{ data: Inbox[] }>('/inboxes', { params });
  return res.data.data;
}

export async function createInbox(name: string, domainId: string): Promise<Inbox> {
  const res = await api.post<{ data: Inbox }>('/inboxes', { name, domainId });
  return res.data.data;
}

export async function deleteInbox(id: string): Promise<void> {
  await api.delete(`/inboxes/${id}`);
}

// Messages
export async function getInboxMessages(
  inboxId: string,
  cursor?: string | null,
  limit = 50,
): Promise<PaginatedResponse<Message>> {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;
  const res = await api.get<PaginatedResponse<Message>>('/messages', {
    params: { inboxId, ...params },
  });
  return res.data;
}

export async function getMessage(id: string): Promise<Message> {
  const res = await api.get<{ data: Message }>(`/messages/${id}`);
  return res.data.data;
}

export async function updateMessageRead(id: string, isRead: number): Promise<Message> {
  const res = await api.patch<{ data: Message }>(`/messages/${id}`, { isRead });
  return res.data.data;
}

export async function deleteMessage(id: string): Promise<void> {
  await api.delete(`/messages/${id}`);
}

// Search
export async function searchMessages(q: string, inboxId?: string): Promise<Message[]> {
  const params: Record<string, string> = { q };
  if (inboxId) params.inboxId = inboxId;
  const res = await api.get<{ data: Message[] }>('/search', { params });
  return res.data.data;
}
