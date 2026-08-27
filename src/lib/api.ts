import { MessageTag } from './types';

export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const API_BASE = `${API_ORIGIN}/api`;

const ACCESS_KEY = 'fboms.accessToken';
const REFRESH_KEY = 'fboms.refreshToken';

/**
 * Tokens live in localStorage. That is the pragmatic choice for a token-based
 * SPA, but it does mean any XSS on this origin can read them — httpOnly
 * refresh cookies would be the hardening step before going to production.
 */
export const tokenStore = {
  get access(): string | null {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(REFRESH_KEY);
  },
  save(accessToken: string, refreshToken: string) {
    window.localStorage.setItem(ACCESS_KEY, accessToken);
    window.localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** Extra fields the backend attached, e.g. `details.allowedTags` on a 422. */
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Internal: prevents an endless refresh loop. */
  retrying?: boolean;
}

async function parse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toApiError(status: number, payload: unknown): ApiError {
  const body = (payload ?? {}) as {
    message?: string | string[];
    details?: Record<string, unknown>;
  };
  const message = Array.isArray(body.message)
    ? body.message.join(', ')
    : (body.message ?? `Request failed with status ${status}`);

  return new ApiError(status, message, body.details);
}

/**
 * One fetch wrapper for every call. On a 401 it tries the refresh token once
 * and replays the request, so a 15-minute access token expiring mid-session is
 * invisible to the user.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const access = tokenStore.access;

  if (access) {
    headers.Authorization = `Bearer ${access}`;
  }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && !options.retrying && tokenStore.refresh) {
    if (await tryRefresh()) {
      return request<T>(path, { ...options, retrying: true });
    }
  }

  const payload = await parse(response);

  if (!response.ok) {
    throw toApiError(response.status, payload);
  }

  return payload as T;
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.refresh;

  if (!refreshToken) {
    return false;
  }

  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    // The refresh token is spent or revoked; force a fresh login.
    tokenStore.clear();
    return false;
  }

  const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
  tokenStore.save(tokens.accessToken, tokens.refreshToken);

  return true;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),

  signup: (input: {
    name: string;
    email: string;
    password: string;
    businessName: string;
    accessCode?: string;
  }) =>
    request<{ accessToken: string; refreshToken: string }>('/auth/signup', {
      method: 'POST',
      body: input,
    }),

  signupPolicy: () =>
    request<{ enabled: boolean; requiresCode: boolean }>('/auth/signup-policy'),

  me: () => request<import('./types').MeResponse>('/auth/me'),

  logout: () =>
    request<{ success: true }>('/auth/logout', {
      method: 'POST',
      body: { refreshToken: tokenStore.refresh ?? undefined },
    }),

  conversations: (pageId: string, page = 1, limit = 30) =>
    request<import('./types').Paginated<import('./types').Conversation>>(
      `/pages/${pageId}/conversations?page=${page}&limit=${limit}`,
    ),

  thread: (conversationId: string, page = 1, limit = 100) =>
    request<import('./types').ConversationThread>(
      `/conversations/${conversationId}/messages?page=${page}&limit=${limit}`,
    ),

  ordersForPage: (pageId: string, filters: import('./types').OrderFilters, page = 1, limit = 30) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });

    if (filters.status) params.set('status', filters.status);
    if (filters.paymentMethod) params.set('paymentMethod', filters.paymentMethod);
    if (filters.q?.trim()) params.set('q', filters.q.trim());

    return request<import('./types').Paginated<import('./types').Order>>(
      `/pages/${pageId}/orders?${params.toString()}`,
    );
  },

  ordersForConversation: (conversationId: string) =>
    request<import('./types').Order[]>(`/conversations/${conversationId}/orders`),

  createOrder: (conversationId: string, input: import('./types').CreateOrderInput) =>
    request<import('./types').Order>(`/conversations/${conversationId}/orders`, {
      method: 'POST',
      body: input,
    }),

  updateOrderStatus: (orderId: string, status: import('./types').OrderStatus) =>
    request<import('./types').Order>(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  /** Returns the Facebook consent URL; the caller navigates to it. */
  facebookConnectUrl: () => request<{ url: string }>('/facebook/connect'),

  pages: () => request<import('./types').ConnectedPage[]>('/pages'),

  disconnectPage: (pageId: string) =>
    request<import('./types').ConnectedPage>(`/pages/${pageId}`, { method: 'DELETE' }),

  dashboard: (pageId: string, days: number) =>
    request<import('./types').DashboardResponse>(`/pages/${pageId}/dashboard?days=${days}`),

  reports: (pageId: string, range: { days?: number; from?: string; to?: string }) => {
    const params = new URLSearchParams();

    // from/to win on the server; sending both would be ambiguous to a reader.
    if (range.from && range.to) {
      params.set('from', range.from);
      params.set('to', range.to);
    } else {
      params.set('days', String(range.days ?? 30));
    }

    return request<import('./types').ReportsResponse>(
      `/pages/${pageId}/reports?${params.toString()}`,
    );
  },

  customers: (pageId: string, q: string, page = 1, limit = 25) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });

    if (q.trim()) params.set('q', q.trim());

    return request<import('./types').Paginated<import('./types').CustomerSummary>>(
      `/pages/${pageId}/customers?${params.toString()}`,
    );
  },

  customer: (conversationId: string) =>
    request<import('./types').CustomerDetail>(`/customers/${conversationId}`),

  team: () => request<import('./types').TeamResponse>('/team'),

  // ---------------------------------------------------------------- billing

  subscription: () => request<import('./types').SubscriptionSummary>('/billing/subscription'),

  plans: () => request<import('./types').Plan[]>('/billing/plans'),

  billingPayments: () => request<import('./types').BillingPayment[]>('/billing/payments'),

  submitPayment: (input: import('./types').SubmitPaymentInput) =>
    request<import('./types').BillingPayment>('/billing/payments', {
      method: 'POST',
      body: input,
    }),

  pendingPayments: () =>
    request<import('./types').PendingPayment[]>('/admin/billing/payments/pending'),

  reviewPayment: (id: string, status: 'CONFIRMED' | 'REJECTED', note?: string) =>
    request<import('./types').BillingPayment>(`/admin/billing/payments/${id}`, {
      method: 'PATCH',
      body: { status, ...(note ? { note } : {}) },
    }),

  extendTrial: (businessId: string, days: number, reason?: string) =>
    request<import('./types').SubscriptionSummary>(
      `/admin/billing/businesses/${businessId}/extend-trial`,
      { method: 'POST', body: { days, ...(reason ? { reason } : {}) } },
    ),

  activatePlan: (
    businessId: string,
    tier: import('./types').PlanTier,
    months: number,
    reason?: string,
  ) =>
    request<import('./types').SubscriptionSummary>(
      `/admin/billing/businesses/${businessId}/activate`,
      { method: 'POST', body: { tier, months, ...(reason ? { reason } : {}) } },
    ),

  inviteStaff: (email: string) =>
    request<import('./types').CreatedInvitation>('/team/invitations', {
      method: 'POST',
      body: { email },
    }),

  revokeInvitation: (invitationId: string) =>
    request<{ success: true }>(`/team/invitations/${invitationId}`, { method: 'DELETE' }),

  setMemberStatus: (memberId: string, status: import('./types').UserStatus) =>
    request<import('./types').TeamMember>(`/team/members/${memberId}/status`, {
      method: 'PATCH',
      body: { status },
    }),

  // Public: the invitee has no account yet, so no token is attached.
  describeInvitation: (token: string) =>
    request<import('./types').InvitationPreview>(`/invitations/${encodeURIComponent(token)}`),

  acceptInvitation: (input: { token: string; name: string; password: string }) =>
    request<{ accessToken: string; refreshToken: string; user: import('./types').AuthUser }>(
      '/invitations/accept',
      { method: 'POST', body: input },
    ),

  adminBusinesses: (q: string, status?: 'ACTIVE' | 'SUSPENDED') => {
    const params = new URLSearchParams({ limit: '50' });

    if (q.trim()) params.set('q', q.trim());
    if (status) params.set('status', status);

    return request<import('./types').Paginated<import('./types').AdminBusiness>>(
      `/admin/businesses?${params.toString()}`,
    );
  },

  adminStats: () => request<import('./types').PlatformStats>('/admin/stats'),

  adminAuditLog: () => request<import('./types').AuditLogEntry[]>('/admin/audit-log?take=25'),

  adminSetBusinessStatus: (
    businessId: string,
    status: 'ACTIVE' | 'SUSPENDED',
    reason?: string,
  ) =>
    request<import('./types').AdminBusiness>(`/admin/businesses/${businessId}/status`, {
      method: 'PATCH',
      body: reason ? { status, reason } : { status },
    }),

  reply: (conversationId: string, text: string, tag?: MessageTag) =>
    request<import('./types').Message>(`/conversations/${conversationId}/reply`, {
      method: 'POST',
      body: tag ? { text, tag } : { text },
    }),
};
