import api from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export type PayUOrderResponse = {
  key: string;
  txnid: string;
  amount: string;
  productinfo: string;
  firstname: string;
  email: string;
  phone: string;
  hash: string;
  surl: string;
  furl: string;
  paymentUrl: string;
  udf1: string;
  udf2: string;
};

type VerifyResponse = {
  status: string;
  subscription: any;
};

const createPayUOrder = (planId: string) =>
  api.post<{ data: PayUOrderResponse }>('/api/v1/subscriptions/payu/create-order', { planId });

const verifyPayUPayment = (txnid: string) =>
  api.post<{ data: VerifyResponse }>('/api/v1/subscriptions/payu/verify', { txnid });

export const useCreatePayUOrder = () =>
  useMutation({
    mutationKey: ['payu-create-order'],
    mutationFn: (planId: string) => createPayUOrder(planId),
  });

export const useVerifyPayUPayment = () =>
  useMutation({
    mutationKey: ['payu-verify-payment'],
    mutationFn: (txnid: string) => verifyPayUPayment(txnid),
  });
