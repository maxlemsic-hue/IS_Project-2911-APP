import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export const statusLabels = {
  PENDING_REVIEW: 'Pending Review',
  IN_REVIEW: 'In Review',
  AVAILABLE_FOR_CONFIRMATION: 'Available for Customer Confirmation',
  DECLINED: 'Declined',
  AWAITING_PAYMENT: 'Awaiting Payment',
  ACCEPTED: 'Accepted',
  PROCESSING: 'Processing',
  READY: 'Ready',
  COMPLETED: 'Completed',
};
export type OrderStatus = keyof typeof statusLabels;
export type ReviewAction = 'review' | 'available' | 'decline';
export type ProductionAction = 'start' | 'ready' | 'complete';
export type StaffRole = 'OWNER_ADMIN' | 'CASHIER' | 'PRODUCTION';
export interface StaffProfile {
  id: string;
  username: string;
  displayName: string;
  role: StaffRole;
}
export interface StaffAccount extends StaffProfile {
  active: boolean;
}
export interface AuditEntry {
  id: string;
  username: string;
  displayName: string;
  action: string;
  occurredAt: string;
}
export interface Milestone {
  status: OrderStatus;
  occurredAt: string;
}

export interface Receipt {
  id: string;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  amount: string | null;
  rejectionReason: string | null;
}

export interface Conversation {
  status: OrderStatus;
  messages: { id: string; sender: 'CUSTOMER' | 'ADMIN'; text: string }[];
  receipts: Receipt[];
  orderTotal: string;
  minimumDeposit: string;
  verifiedTotal: string;
  remainingBalance: string;
  depositMet: boolean;
  paidInFull: boolean;
}

export interface OrderSummary {
  reference: string;
  customerName?: string;
  status: OrderStatus;
  createdAt: string;
}

export interface OrderDetails extends OrderSummary {
  productionStaffId?: string | null;
  contactPhone?: string;
  declineReason?: string | null;
  orderTotal?: `${number}`;
  items: {
    id: string;
    productName: string;
    productSku: string;
    quantity: number;
    sellingUnit: string;
    unitPrice?: `${number}`;
  }[];
}

@Injectable({ providedIn: 'root' })
export class OrdersApi {
  private readonly http = inject(HttpClient);
  private readonly base = 'http://localhost:3001/api/v1';
  private readonly url = this.base + '/admin/orders';
  private readonly credentials = { withCredentials: true, headers: { 'X-Staff-Request': '1' } };

  login(username: string, password: string) {
    return firstValueFrom(
      this.http.post<StaffProfile>(
        this.base + '/staff/login',
        { username, password },
        this.credentials,
      ),
    );
  }

  me() {
    return firstValueFrom(this.http.get<StaffProfile>(this.base + '/staff/me', this.credentials));
  }

  logout() {
    return firstValueFrom(
      this.http.post<void>(this.base + '/staff/logout', null, this.credentials),
    );
  }

  accounts() {
    return firstValueFrom(
      this.http.get<StaffAccount[]>(this.base + '/admin/staff', this.credentials),
    );
  }

  createAccount(body: { username: string; displayName: string; password: string; role: string }) {
    return firstValueFrom(
      this.http.post<StaffAccount>(this.base + '/admin/staff', body, this.credentials),
    );
  }

  activate(id: string, active: boolean) {
    return firstValueFrom(
      this.http.patch<StaffAccount>(
        this.base + '/admin/staff/' + encodeURIComponent(id) + '/active',
        { active },
        this.credentials,
      ),
    );
  }

  assign(reference: string, productionStaffId: string | null) {
    return firstValueFrom(
      this.http.patch<{ productionStaffId: string | null }>(
        this.orderUrl(reference) + '/assignment',
        { productionStaffId },
        this.credentials,
      ),
    );
  }

  audit(reference: string) {
    return firstValueFrom(
      this.http.get<AuditEntry[]>(this.orderUrl(reference) + '/audit', this.credentials),
    );
  }

  private orderUrl(reference: string) {
    return `${this.url}/${encodeURIComponent(reference)}`;
  }

  progress(reference: string) {
    return firstValueFrom(
      this.http.get<Milestone[]>(this.orderUrl(reference) + '/progress', {
        ...this.credentials,
      }),
    );
  }

  advance(reference: string, action: ProductionAction) {
    return firstValueFrom(
      this.http.patch<{ status: OrderStatus }>(
        this.orderUrl(reference) + '/progress',
        { action },
        {
          ...this.credentials,
        },
      ),
    );
  }

  conversation(reference: string) {
    return firstValueFrom(
      this.http.get<Conversation>(this.orderUrl(reference) + '/conversation', {
        ...this.credentials,
      }),
    );
  }

  message(reference: string, text: string) {
    return firstValueFrom(
      this.http.post<void>(this.orderUrl(reference) + '/conversation', { text }, this.credentials),
    );
  }

  receipt(reference: string, id: string) {
    return firstValueFrom(
      this.http.get(this.orderUrl(reference) + '/receipts/' + encodeURIComponent(id), {
        ...this.credentials,
        responseType: 'blob',
      }),
    );
  }

  verify(
    reference: string,
    id: string,
    body: {
      decision: 'approve' | 'reject';
      reason?: string;
      amount?: string;
      paymentReference?: string;
      fundsReceived?: boolean;
    },
  ) {
    return firstValueFrom(
      this.http.patch<void>(
        this.orderUrl(reference) + '/receipts/' + encodeURIComponent(id),
        body,
        this.credentials,
      ),
    );
  }

  accept(reference: string, manualStockChecked: boolean) {
    return firstValueFrom(
      this.http.post<void>(
        this.orderUrl(reference) + '/accept',
        { manualStockChecked },
        this.credentials,
      ),
    );
  }

  list() {
    return firstValueFrom(this.http.get<OrderSummary[]>(this.url, this.credentials));
  }

  details(reference: string) {
    return firstValueFrom(
      this.http.get<OrderDetails>(`${this.url}/${encodeURIComponent(reference)}`, {
        ...this.credentials,
      }),
    );
  }

  update(reference: string, action: ReviewAction, reason: string) {
    return firstValueFrom(
      this.http.patch<OrderDetails>(
        `${this.url}/${encodeURIComponent(reference)}/status`,
        { action, reason },
        this.credentials,
      ),
    );
  }
}
