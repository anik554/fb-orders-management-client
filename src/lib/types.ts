export type MessageDirection = 'INCOMING' | 'OUTGOING';
export type SentBy = 'CUSTOMER' | 'AGENT' | 'SYSTEM';

export const MESSAGE_TAGS = [
  'HUMAN_AGENT',
  'POST_PURCHASE_UPDATE',
  'ACCOUNT_UPDATE',
  'CONFIRMED_EVENT_UPDATE',
] as const;

export type MessageTag = (typeof MESSAGE_TAGS)[number];

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'STAFF';
  businessId: string | null;
}

export interface PageSummary {
  id: string;
  facebookPageId: string;
  pageName: string;
}

export interface MeResponse extends AuthUser {
  business: { id: string; name: string; status: 'ACTIVE' | 'SUSPENDED' } | null;
  pages: PageSummary[];
  /** Null for a platform admin, who has no business to subscribe. */
  subscription: SubscriptionSummary | null;
}

export interface MessagingWindow {
  isOpen: boolean;
  expiresAt: string | null;
  lastCustomerMessageAt: string | null;
}

export interface Conversation {
  id: string;
  pageId: string;
  customerPsid: string;
  customerName: string | null;
  lastMessageAt: string;
  messageCount: number;
  lastMessage: {
    text: string | null;
    direction: MessageDirection;
    createdAt: string;
    hasAttachment: boolean;
  } | null;
  messagingWindow: MessagingWindow;
}

export interface Message {
  id: string;
  conversationId: string;
  direction: MessageDirection;
  sentBy: SentBy;
  text: string | null;
  attachmentUrl: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface ConversationThread {
  conversation: Conversation;
  messages: Message[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/** Emitted by the backend gateway on the /realtime namespace. */
export interface NewMessageEvent {
  pageId: string;
  conversation: {
    id: string;
    customerPsid: string;
    customerName: string | null;
    lastMessageAt: string;
  };
  message: {
    id: string;
    direction: MessageDirection;
    sentBy: SentBy;
    text: string | null;
    attachmentUrl: string | null;
    createdAt: string;
  };
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_METHODS = ['COD', 'BKASH', 'NAGAD', 'CARD'] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  /** Decimal strings, so money never passes through a float. */
  price: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  conversationId: string;
  pageId: string;
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: PaymentMethod;
  totalAmount: string;
  status: OrderStatus;
  /** Sent by the API, so the UI only offers moves that will succeed. */
  allowedTransitions: OrderStatus[];
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderDraftItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  customerName: string;
  phone: string;
  address: string;
  paymentMethod: PaymentMethod;
  items: OrderDraftItem[];
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentMethod?: PaymentMethod;
  q?: string;
}

export interface OrderStatusUpdatedEvent {
  pageId: string;
  orderId: string;
  status: OrderStatus;
}

export interface AdminPage {
  id: string;
  facebookPageId: string;
  pageName: string;
  status: string;
  connectedAt: string;
}

export interface AdminBusiness {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: string;
  owner: { id: string; name: string; email: string } | null;
  pages: AdminPage[];
  /** Volume only — the admin API exposes no message or order content. */
  counts: { users: number; pages: number; conversations: number; orders: number };
}

export interface PlatformStats {
  businesses: { total: number; active: number; suspended: number };
  pages: { total: number; active: number; disconnected: number };
  conversations: { total: number };
  messages: { total: number; incoming: number; outgoing: number; last24h: number };
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    deliveredValue: string;
  };
  generatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  details: { businessName?: string; reason?: string | null; newStatus?: string } | null;
  createdAt: string;
}

export interface ConnectedPage {
  id: string;
  businessId: string;
  facebookPageId: string;
  pageName: string;
  status: 'ACTIVE' | 'DISCONNECTED';
  connectedAt: string;
  disconnectedAt: string | null;
}

/* ------------------------------------------------ dashboard / reports / customers */

export interface RangeMeta {
  from: string;
  to: string;
  days: number;
}

export interface AwaitingReply {
  conversationId: string;
  customerPsid: string;
  customerName: string | null;
  lastMessageAt: string;
  preview: string | null;
  windowExpiresAt: string | null;
  windowIsOpen: boolean;
  waitingHours: number;
}

export interface DashboardResponse {
  range: RangeMeta;
  totals: {
    newConversations: number;
    activeConversations: number;
    messagesIn: number;
    messagesOut: number;
    ordersCreated: number;
    /** Delivered — money actually collected. */
    revenueDelivered: string;
    /** Pending, confirmed or shipped — promised but not yet collected. */
    revenueInFlight: string;
  };
  ordersByStatus: Record<OrderStatus, number>;
  awaitingReply: AwaitingReply[];
  closingSoon: AwaitingReply[];
}

export interface ReportsResponse {
  range: RangeMeta;
  daily: Array<{
    date: string;
    messagesIn: number;
    messagesOut: number;
    ordersCreated: number;
    revenueDelivered: string;
  }>;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByPayment: Record<PaymentMethod, number>;
  topProducts: Array<{ productName: string; quantity: number; revenue: string }>;
  topCustomers: Array<{
    conversationId: string | null;
    customerName: string;
    phone: string;
    orders: number;
    spent: string;
  }>;
  totals: { ordersCreated: number; revenueDelivered: string; averageOrderValue: string };
}

export interface CustomerSummary {
  conversationId: string;
  customerPsid: string;
  customerName: string | null;
  firstSeenAt: string;
  lastMessageAt: string;
  messageCount: number;
  orderCount: number;
  totalSpent: string;
  phone: string | null;
  windowIsOpen: boolean;
}

export interface CustomerDetail {
  conversationId: string;
  pageId: string;
  pageName: string;
  customerPsid: string;
  customerName: string | null;
  phone: string | null;
  firstSeenAt: string;
  lastMessageAt: string;
  messageCount: number;
  messagingWindow: MessagingWindow;
  stats: { orderCount: number; deliveredCount: number; totalSpent: string };
  orders: Order[];
}

/* ---------------------------------------------------------------------- team */

export type UserStatus = 'ACTIVE' | 'DISABLED';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'BUSINESS_OWNER' | 'STAFF';
  status: UserStatus;
  createdAt: string;
  /** True for the signed-in owner, so the UI cannot offer to lock them out. */
  isYou: boolean;
}

export interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  invitedBy: string | null;
  expiresAt: string;
  createdAt: string;
  isExpired: boolean;
}

export interface CreatedInvitation extends PendingInvitation {
  /** Shown once. Only a hash is stored, so it can never be retrieved again. */
  inviteUrl: string;
}

export interface TeamResponse {
  members: TeamMember[];
  invitations: PendingInvitation[];
}

export interface InvitationPreview {
  email: string;
  role: string;
  businessName: string;
  expiresAt: string;
}

// ------------------------------------------------------------------ billing

export const PLAN_TIERS = ['TRIAL', 'STARTER', 'GROWTH', 'PRO'] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const BILLING_METHODS = ['BKASH', 'NAGAD', 'BANK_TRANSFER', 'MANUAL'] as const;
export type BillingMethod = (typeof BILLING_METHODS)[number];

/** How the shop pays, in the order the form offers them. MANUAL is admin-only. */
export const PAYABLE_METHODS: BillingMethod[] = ['BKASH', 'NAGAD', 'BANK_TRANSFER'];

export type BillingPaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export type EntitlementState = 'TRIALING' | 'ACTIVE' | 'GRACE' | 'EXPIRED';

export interface SubscriptionSummary {
  tier: PlanTier;
  planName: string;
  state: EntitlementState;
  /** False once the shop can no longer change anything. Reads always work. */
  canWrite: boolean;
  isTrial: boolean;
  willRenew: boolean;
  currentPeriodEnd: string;
  /** Period end plus any grace — when writes actually stop. */
  writeAccessEndsAt: string;
  daysRemaining: number;
  usage: { pages: number; maxPages: number; staff: number; maxStaff: number };
}

export interface PlanPeriod {
  months: number;
  price: number;
  monthsFree: number;
}

export interface Plan {
  tier: PlanTier;
  name: string;
  monthlyPrice: number;
  maxPages: number;
  maxStaff: number;
  blurb: string;
  periods: PlanPeriod[];
}

export interface BillingPayment {
  id: string;
  tier: PlanTier;
  planName: string;
  months: number;
  /** Decimal string, e.g. "2490.00". */
  amount: string;
  currency: string;
  method: BillingMethod;
  reference: string;
  status: BillingPaymentStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  createdAt: string;
}

export interface PendingPayment extends BillingPayment {
  businessId: string;
  businessName: string;
}

export interface SubmitPaymentInput {
  tier: PlanTier;
  months: number;
  method: BillingMethod;
  reference: string;
}
