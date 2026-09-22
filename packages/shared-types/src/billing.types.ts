export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'VOID';

export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'BANK_TRANSFER'
  | 'MOBILE_MONEY';

export type PaymentStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

export type ServiceStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface IInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  invoiceId: string;
  createdAt: Date | string;
}

export interface IPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string | null;
  invoiceId: string;
  paidAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IInvoice {
  id: string;
  invoiceNumber: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  reservationId: string;
  items: IInvoiceItem[];
  payments: IPayment[];
  totalPaid?: number;
  balanceDue?: number;
  issuedAt: Date | string | null;
  paidAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  active: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IServiceOrder {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  status: ServiceStatus;
  serviceId: string;
  service?: IService;
  reservationId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ICreateInvoiceInput {
  reservationId: string;
  taxRatePercent?: number; // e.g., 10 for 10%
  discount?: number;
}

export interface IAddInvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface IRecordPaymentInput {
  amount: number;
  method: PaymentMethod;
  transactionReference?: string | null;
}

export interface ICreateServiceInput {
  name: string;
  description?: string | null;
  price: number;
}

export interface IUpdateServiceInput {
  name?: string;
  description?: string | null;
  price?: number;
  active?: boolean;
}

export interface ICreateServiceOrderInput {
  serviceId: string;
  reservationId: string;
  quantity: number;
  postToInvoice?: boolean; // automatically append to reservation's active invoice
}

export interface IInvoiceFilterQuery {
  status?: InvoiceStatus;
  reservationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface IBillingSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  invoicesCount: {
    draft: number;
    issued: number;
    partiallyPaid: number;
    paid: number;
    void: number;
  };
}
