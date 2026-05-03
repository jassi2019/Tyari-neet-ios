import api from '@/lib/api';
import env from '@/constants/env';
import { openRazorpay } from '@/libs/razorpay';
import { TApiPromise, TMutationOpts } from '@/types/api';
import { TPlan } from '@/types/Plan';
import { useMutation } from '@tanstack/react-query';
import { Platform } from 'react-native';

type TCreateOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  notes: {
    email: string;
    name: string;
    userId?: string;
    planId?: string;
  };
};

const createOrder = (planId: TPlan['id']): TApiPromise<TCreateOrderResponse> => {
  return api.post('/api/v1/subscriptions/create-order', {
    planId,
  });
};

const createSubscription = (data: {
  orderId: string;
  paymentId: string;
  signature: string;
  planId: string;
}): TApiPromise => {
  return api.post('/api/v1/subscriptions', data);
};

export const useCreateOrder = (options?: TMutationOpts<TPlan['id'], TCreateOrderResponse>) => {
  return useMutation({
    mutationKey: ['create-order'],
    mutationFn: (planId: TPlan['id']) => createOrder(planId),
    ...options,
  });
};

export const useCreateSubscription = (
  options?: TMutationOpts<
    {
      orderId: string;
      paymentId: string;
      signature: string;
      planId: string;
    },
    void
  >
) => {
  return useMutation({
    mutationKey: ['create-subscription'],
    mutationFn: (data: { orderId: string; paymentId: string; signature: string; planId: string }) =>
      createSubscription(data),
    ...options,
  });
};

export const initiateRazorpayPayment = async ({
  order,
  plan,
}: {
  order: TCreateOrderResponse;
  plan: TPlan;
}) => {
  if (Platform.OS === 'web') {
    throw new Error('Payments are not available on web. Please use the iOS/Android app.');
  }

  if (Platform.OS !== 'android') {
    throw new Error('Razorpay payments are only available on Android.');
  }

  if (!env.razorpayKeyId) {
    throw new Error('Razorpay is not configured. Missing EXPO_PUBLIC_RAZORPAY_KEY_ID.');
  }

  const payableAmountPaise = Number(order.amount);
  if (!Number.isFinite(payableAmountPaise) || payableAmountPaise <= 0) {
    throw new Error('Invalid order amount.');
  }

  if (!String(order.id || '').startsWith('order_')) {
    throw new Error('Invalid Razorpay order id returned by the server.');
  }

  console.log('Initiating Razorpay payment', {
    orderId: order.id,
    amount: payableAmountPaise,
    currency: order.currency || 'INR',
    planId: plan.id,
    razorpayKeyPrefix: env.razorpayKeyId.split('_').slice(0, 2).join('_'),
  });

  let result;
  try {
    result = await openRazorpay({
      description: plan.name,
      currency: order.currency || 'INR',
      key: env.razorpayKeyId,
      amount: payableAmountPaise, // paise (as returned by Razorpay order API)
      name: 'Taiyari NEET Ki',
      order_id: order.id,
      prefill: {
        email: order.notes?.email,
        name: order.notes?.name,
      },
      theme: { color: '#F1BB3E' },
    });
  } catch (error: any) {
    const rawMessage = String(error?.description || error?.message || error || '');
    const normalizedMessage = rawMessage.toLowerCase();

    if (
      normalizedMessage.includes('http response code failure') ||
      normalizedMessage.includes('checkout/public')
    ) {
      throw new Error(
        'Razorpay checkout could not be loaded. This usually means the app key and the server-created order are from different Razorpay modes (test vs live). Check EXPO_PUBLIC_RAZORPAY_KEY_ID and the backend RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET.'
      );
    }

    throw error;
  }

  if (!result) {
    throw new Error(
      'Razorpay is not available. Please use a development build (not Expo Go) and try again.'
    );
  }

  const paymentId = String(result?.razorpay_payment_id || result?.payment_id || '').trim();
  const orderId = String(result?.razorpay_order_id || result?.order_id || '').trim();
  const signature = String(result?.razorpay_signature || result?.signature || '').trim();

  if (!paymentId || !orderId || !signature) {
    throw new Error('Invalid payment response from Razorpay.');
  }

  return { paymentId, orderId, signature };
};
