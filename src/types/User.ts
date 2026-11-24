import { TSubscription } from './Subscription';

export type TUser = {
  id: string;
  name: string;
  email: string;
  profilePicture: string | null;
  bio: string | null;
  role: string;
  registrationSource: string;
  // Not returned from profile endpoints; only used for auth inputs.
  password?: string;
  createdAt: string;
  updatedAt: string;
  // Billing address, filled on the payment screen and printed on the GST invoice.
  addressLine?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  subscription: TSubscription | null;
};
