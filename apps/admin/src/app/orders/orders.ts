import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import {
  OrdersApi,
  statusLabels,
  type OrderDetails,
  type OrderSummary,
  type ReviewAction,
  type Conversation,
  type Milestone,
  type OrderStatus,
  type ProductionAction,
  type StaffProfile,
  type StaffAccount,
  type AuditEntry,
} from './orders-api';

@Component({
  imports: [DatePipe],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class Orders {
  private readonly api = inject(OrdersApi);

  protected readonly user = signal<StaffProfile | null>(null);
  protected readonly accounts = signal<StaffAccount[]>([]);
  protected readonly auditEntries = signal<AuditEntry[] | null>(null);
  protected readonly roleLabels = {
    OWNER_ADMIN: 'Owner/Admin',
    CASHIER: 'Cashier',
    PRODUCTION: 'Production Staff',
  };
  protected readonly orders = signal<OrderSummary[]>([]);
  protected readonly order = signal<OrderDetails | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly labels = statusLabels;
  protected readonly conversationData = signal<Conversation | null>(null);
  protected readonly milestones = signal<Milestone[] | null>(null);
  protected readonly receiptUrl = signal('');
  protected readonly receiptLabels = {
    PENDING_VERIFICATION: 'Pending Verification',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearConversation());
    void this.restore();
  }
  private readonly money = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 4,
  });

  protected formatMoney(value: string) {
    const [whole, fraction = ''] = value.split('.');
    const digits = fraction.replace(/0+$/, '').padEnd(2, '0');
    return this.money
      .formatToParts(BigInt(whole))
      .map((part) => (part.type === 'fraction' ? digits : part.value))
      .join('');
  }

  protected owner() {
    return this.user()?.role === 'OWNER_ADMIN';
  }

  private async openSession(user: StaffProfile) {
    this.user.set(user);
    if (user.role !== 'CASHIER') this.orders.set(await this.api.list());
    if (user.role === 'OWNER_ADMIN') this.accounts.set(await this.api.accounts());
  }

  private async restore() {
    await this.perform(async () => {
      try {
        await this.openSession(await this.api.me());
      } catch (error) {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) throw error;
        this.clearSession();
      }
    });
  }

  protected async login(username: string, input: HTMLInputElement) {
    const password = input.value;
    input.value = '';
    await this.perform(async () => this.openSession(await this.api.login(username, password)));
  }

  protected async logout() {
    await this.perform(async () => {
      await this.api.logout();
      this.clearSession();
    });
  }

  private clearSession() {
    this.user.set(null);
    this.orders.set([]);
    this.accounts.set([]);
    this.order.set(null);
    this.clearConversation();
  }

  protected async addAccount(
    username: string,
    displayName: string,
    input: HTMLInputElement,
    role: string,
  ) {
    const password = input.value;
    input.value = '';
    await this.perform(async () => {
      await this.api.createAccount({ username, displayName, password, role });
      this.accounts.set(await this.api.accounts());
    });
  }

  protected async toggleAccount(account: StaffAccount) {
    await this.perform(async () => {
      await this.api.activate(account.id, !account.active);
      this.accounts.set(await this.api.accounts());
    });
  }

  protected async assignStaff(id: string) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      const assignment = await this.api.assign(order.reference, id || null);
      this.order.set({ ...order, ...assignment });
      this.auditEntries.set(null);
    });
  }

  protected async audit() {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => this.auditEntries.set(await this.api.audit(order.reference)));
  }

  protected async open(reference: string) {
    await this.perform(async () => {
      this.clearConversation();
      this.order.set(await this.api.details(reference));
    });
  }

  protected async refresh() {
    await this.perform(async () => {
      this.order.set(null);
      this.clearConversation();
      this.orders.set(await this.api.list());
    });
  }

  private clearConversation() {
    URL.revokeObjectURL(this.receiptUrl());
    this.receiptUrl.set('');
    this.conversationData.set(null);
    this.milestones.set(null);
    this.auditEntries.set(null);
  }

  private setStatus(reference: string, status: OrderStatus) {
    const order = this.order();
    if (order?.reference === reference) this.order.set({ ...order, status });
    this.orders.update((orders) =>
      orders.map((entry) => (entry.reference === reference ? { ...entry, status } : entry)),
    );
    this.conversationData.update((chat) => (chat ? { ...chat, status } : chat));
  }

  private async loadProgress(reference: string) {
    const milestones = await this.api.progress(reference);
    this.milestones.set(milestones);
    const latest = milestones.at(-1);
    if (latest) this.setStatus(reference, latest.status);
  }

  protected async progress() {
    const order = this.order();
    if (!order) return;
    await this.perform(() => this.loadProgress(order.reference));
  }

  protected async advance(action: ProductionAction) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      const result = await this.api.advance(order.reference, action);
      this.setStatus(order.reference, result.status);
      await this.loadProgress(order.reference);
    });
  }

  protected async conversation() {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      const chat = await this.api.conversation(order.reference);
      this.conversationData.set(chat);
      this.setStatus(order.reference, chat.status);
    });
  }

  protected async reply(input: HTMLTextAreaElement) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      await this.api.message(order.reference, input.value);
      input.value = '';
      this.conversationData.set(await this.api.conversation(order.reference));
    });
  }

  protected async viewReceipt(id: string) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      const image = await this.api.receipt(order.reference, id);
      URL.revokeObjectURL(this.receiptUrl());
      this.receiptUrl.set(URL.createObjectURL(image));
    });
  }

  protected async verifyReceipt(id: string, body: Parameters<OrdersApi['verify']>[2]) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      await this.api.verify(order.reference, id, body);
      this.conversationData.set(await this.api.conversation(order.reference));
    });
  }

  protected async accept(manualStockChecked: boolean) {
    const order = this.order();
    if (!order) return;
    await this.perform(async () => {
      await this.api.accept(order.reference, manualStockChecked);
      this.setStatus(order.reference, 'ACCEPTED');
      this.conversationData.set(await this.api.conversation(order.reference));
    });
  }

  protected async update(action: ReviewAction, reason = '') {
    const order = this.order();
    if (!order) return;
    if (action === 'decline' && !reason.trim()) {
      this.error.set('Enter a decline reason.');
      return;
    }
    await this.perform(async () => {
      const updated = await this.api.update(order.reference, action, reason);
      this.order.set(updated);
      this.orders.update((orders) =>
        orders.map((entry) =>
          entry.reference === updated.reference ? { ...entry, status: updated.status } : entry,
        ),
      );
    });
  }

  private async perform(task: () => Promise<void>) {
    if (this.busy()) return;
    this.error.set('');
    this.busy.set(true);
    try {
      await task();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) this.clearSession();
      const message: unknown =
        error instanceof HttpErrorResponse ? error.error?.message : undefined;
      this.error.set(
        typeof message === 'string' ? message : 'Could not reach the Admin order service.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
