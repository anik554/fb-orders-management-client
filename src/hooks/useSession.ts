'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { isSpecificReason } from '@/components/ErrorNotice';
import { ApiError, api, tokenStore } from '@/lib/api';
import { MeResponse } from '@/lib/types';

export type RequiredRole = 'BUSINESS_OWNER' | 'STAFF' | 'SUPER_ADMIN';

/** Screens a shop's whole team may use. */
export const TEAM_ROLES: RequiredRole[] = ['BUSINESS_OWNER', 'STAFF'];

export interface Session {
  me: MeResponse | undefined;
  /** True while the identity is unknown, or a sign-in redirect is in flight. */
  loading: boolean;
  /** True once the identity is known and allowed on this screen. */
  authorised: boolean;
  /**
   * Signed in, but with an account this screen is not for. The page should say
   * so rather than render — see WrongAccountNotice.
   */
  wrongRole: boolean;
  /** The roles this screen accepts, for the message shown to the user. */
  requiredRole?: RequiredRole | RequiredRole[];
}

/**
 * One place for "who is looking at this screen, and may they be here".
 *
 * Only the unauthenticated case redirects. A wrong *role* deliberately does not:
 * silently bouncing a platform admin from /settings/pages to /admin looks like
 * the link is broken — they click it, land somewhere else, and have no idea why.
 * That cost us several rounds of debugging. The page shows an explanation and a
 * way to switch accounts instead.
 *
 * None of this is the security boundary. The API checks the role on every
 * request; this only decides what the user is told.
 */
export function useSession(requiredRole?: RequiredRole | RequiredRole[]): Session {
  const router = useRouter();

  const query = useQuery({ queryKey: ['me'], queryFn: api.me, retry: false });

  const unauthenticated = query.error instanceof ApiError && query.error.status === 401;

  useEffect(() => {
    if (!unauthenticated) {
      return;
    }

    tokenStore.clear();

    // Carry the reason to the sign-in screen when there is one. A suspended or
    // disabled account looks exactly like an expired token from here, and
    // bouncing someone to /login with no explanation makes them guess — or ask
    // us. An ordinary expiry carries nothing, so it stays quiet.
    const reason =
      query.error instanceof ApiError && isSpecificReason(query.error.message)
        ? query.error.message
        : null;

    router.replace(reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login');
  }, [unauthenticated, router, query.error]);

  const role = query.data?.role;
  const accepted = requiredRole
    ? Array.isArray(requiredRole)
      ? requiredRole
      : [requiredRole]
    : undefined;
  const wrongRole = Boolean(role && accepted && !accepted.includes(role as RequiredRole));

  return {
    me: query.data,
    loading: query.isLoading || unauthenticated,
    authorised: Boolean(query.data) && !wrongRole,
    wrongRole,
    requiredRole,
  };
}
