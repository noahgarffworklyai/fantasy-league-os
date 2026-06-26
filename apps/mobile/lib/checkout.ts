import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { api } from './api';

WebBrowser.maybeCompleteAuthSession();

export type CheckoutResult =
  | { ok: true; leagueId: string }
  | { ok: false; reason: 'cancelled' | 'failed' };

type CheckoutResponse = {
  checkoutUrl: string;
  sessionId: string;
  devMode?: boolean;
};

export async function startBuyInCheckout(leagueId: string): Promise<CheckoutResult> {
  const successUrl = Linking.createURL(`payment/success?leagueId=${leagueId}`);
  const cancelUrl = Linking.createURL(`payment/cancel?leagueId=${leagueId}`);

  const checkout = await api.post<CheckoutResponse>(`/leagues/${leagueId}/payments/checkout`, {
    successUrl,
    cancelUrl,
  });

  if (checkout.devMode) {
    return { ok: true, leagueId };
  }

  const redirectUrl = Linking.createURL('payment/success');
  const result = await WebBrowser.openAuthSessionAsync(checkout.checkoutUrl, redirectUrl);

  if (result.type !== 'success' || !result.url) {
    return { ok: false, reason: 'cancelled' };
  }

  const parsed = Linking.parse(result.url);
  const sessionId =
    typeof parsed.queryParams?.session_id === 'string'
      ? parsed.queryParams.session_id
      : checkout.sessionId;

  const status = await api.get<{ paid: boolean; leagueId: string }>(
    `/payments/checkout/${sessionId}/status`,
  );

  if (!status.paid) {
    return { ok: false, reason: 'failed' };
  }

  return { ok: true, leagueId: status.leagueId };
}

export async function confirmCheckoutSession(
  sessionId: string,
): Promise<{ paid: boolean; leagueId: string }> {
  return api.get(`/payments/checkout/${sessionId}/status`);
}
