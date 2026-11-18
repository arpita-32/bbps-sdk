export type SdkLanguage = 'en' | 'hi' | 'bn';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export type SdkTab = 'home' | 'my-billers' | 'payments' | 'complaints';

export type HostThemeId = 'apex-navy' | 'emerald-coop' | 'saffron-bank' | 'midnight-dark';

export interface HostTheme {
  id: HostThemeId;
  bankName: string;
  shortCode: string;
  primaryColor: string;
  primaryHover: string;
  headerBg: string;
  headerText: string;
  isDarkHeader: boolean;
  accentSoftBg: string;
  accentText: string;
  supportTollFree: string;
  supportWebsite: string;
}

export type SdkErrorCode =
  | 'ERR_INVALID_PARTNER'
  | 'ERR_SESSION_EXPIRED'
  | 'ERR_INVALID_ENV'
  | 'ERR_INVALID_CUSTOMER';

export interface SdkConfig {
  partnerId: string;
  environment: 'UAT' | 'PROD' | 'INVALID';
  customerId: string;
  sessionToken: string;
  language: SdkLanguage;
  customLogoOverrideAttempt: boolean;
}

export interface HostCallbackEvent {
  id: string;
  timestamp: string;
  callback:
    | 'onPaymentResult'
    | 'onBillerAdded'
    | 'onBillerDeleted'
    | 'onComplaintRaised'
    | 'onSDKClosed'
    | 'onSessionExpired'
    | 'onInitError';
  payload: Record<string, string | number | boolean>;
}

export type BillerAmountRule =
  | { type: 'exact' }
  | { type: 'partial'; minAmount: number }
  | { type: 'any' };

export interface MdmField {
  id: string;
  label: string;
  placeholder: string;
  required: boolean;
  dataType: 'numeric' | 'alphanumeric';
  exactLength?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  validationMessage: string;
  editableOnModify?: boolean;
}

export interface BillerCategory {
  id: string;
  name: string;
  iconKey: string;
  isMasterSynced?: boolean;
}

export interface BillerDefinition {
  id: string;
  name: string;
  shortCode: string;
  categoryId: string;
  brandColor: string;
  supportsFetch: boolean;
  supportsAutopay: boolean;
  ccfFee: number;
  amountRule: BillerAmountRule;
  mdmFields: MdmField[];
  sampleBillAmount: number;
}

export type BillerRegStatus = 'Active' | 'Pending for authorization' | 'Rejected';

export interface SavedBiller {
  id: string;
  billerId: string;
  billerName: string;
  categoryId: string;
  categoryName: string;
  nickname: string;
  authenticatorLabel: string;
  authenticatorValue: string;
  params: Record<string, string>;
  pendingAmount: number | null;
  dueDate: string | null;
  status: BillerRegStatus;
  rejectionReason?: string;
  autopayEnabled: boolean;
  supportsAutopay: boolean;
  registrationDate: string;
  billerAccountId: string;
  uniqueRegNumber: string;
  paymentChannel: string;
}

export interface PaymentMethodAccount {
  id: string;
  label: string;
  maskedNumber: string;
  type: 'Savings Account' | 'Current Account' | 'UPI' | 'Debit Card';
  balance: number | null; // null if host chooses not to share balance
}

export type PaymentStatus = 'Success' | 'Failed' | 'Pending';

export interface TransactionRecord {
  id: string;
  bConnectTxnId: string;
  txnRefId: string;
  sourceRefNo: string;
  approvalRefNo: string;
  billerId: string;
  billerName: string;
  categoryName: string;
  subscriberNumber: string;
  maskedAccount: string;
  mobileNumber: string;
  billNumber: string;
  billDate: string;
  dueDate: string;
  billAmount: number;
  ccf: number;
  taxAmount: number;
  totalAmount: number;
  txnDateTime: string;
  txnDateIso: string; // YYYY-MM-DD for filtering
  status: PaymentStatus;
  billerStatus: 'ACCEPTED' | 'DECLINED' | 'AWAITING_CONFIRMATION';
  paymentType: 'Pay Now' | 'Pay Later' | 'Quick Pay';
  paymentChannel: 'Internet Banking' | 'Mobile Banking';
  paymentMethod: string;
  params: Record<string, string>;
}

export type ComplaintType = 'Transaction' | 'Service';
export type ComplaintStatus = 'Registered' | 'In Progress' | 'Resolved' | 'Closed';

export interface ComplaintRecord {
  id: string;
  complaintId: string;
  type: ComplaintType;
  mobileNumber: string;
  txnRefId?: string;
  participationType?: 'Biller' | 'Agent';
  entityName?: string;
  reason: string;
  description: string;
  dateRaised: string;
  dateIso: string;
  lastUpdated: string;
  status: ComplaintStatus;
  remarks?: string;
  expectedResolution: string;
}

export interface SimulationControls {
  fetchOutcome: 'normal' | 'no-dues' | 'unavailable' | 'invalid-data' | 'timeout';
  paymentOutcome: 'success' | 'failed' | 'pending' | 'network-lost';
  networkOnline: boolean;
  audioState: 'normal' | 'muted' | 'fail-load';
  addBillerOutcome: 'success' | 'invalid-params' | 'unavailable' | 'rejected' | 'timeout';
  complaintOutcome: 'success' | 'server-error';
}
