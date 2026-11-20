import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PosApi,
  type CartLine,
  type Product,
  type StaffProfile,
  type WalkInOrder,
} from './pos-api';
import { money, priceUnits } from './pos-money';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly api = inject(PosApi);
  protected readonly user = signal<StaffProfile | null>(null);
  protected readonly products = signal<Product[]>([]);
  protected readonly images = signal<Record<string, { url: string; alt: string }>>({});
  protected readonly cart = signal<CartLine[]>([]);
  protected readonly query = signal('');
  protected readonly category = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly receipt = signal<WalkInOrder | null>(null);
  protected customerName = '';
  protected contactPhone = '';
  protected readonly allowed = computed(() =>
    ['OWNER_ADMIN', 'CASHIER'].includes(this.user()?.role || ''),
  );
  protected readonly categories = computed(() => [
    ...new Set(this.products().map((product) => product.category.name)),
  ]);
  protected readonly visible = computed(() =>
    this.products().filter(
      (product) =>
        (!this.category() || product.category.name === this.category()) &&
        (product.name.toLowerCase().includes(this.query().toLowerCase()) ||
          product.sku.toLowerCase().includes(this.query().toLowerCase())),
    ),
  );
  protected readonly invalid = computed(
    () => !this.cart().length || this.cart().some((line) => !this.validLine(line)),
  );
  protected readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + this.subtotal(line), 0n),
  );
  protected readonly money = money;
  protected readonly priceUnitsForReceipt = priceUnits;
  constructor() {
    void this.restore();
  }
  protected product(id: string) {
    return this.products().find((product) => product.id === id);
  }
  protected validLine(line: CartLine) {
    const product = this.product(line.productId);
    return (
      !!product &&
      typeof line.quantity === 'number' &&
      Number.isInteger(line.quantity) &&
      line.quantity >= product.minimumOrderQuantity &&
      line.quantity <= 2147483647
    );
  }
  protected subtotal(line: CartLine) {
    return this.validLine(line)
      ? priceUnits(this.product(line.productId)!.unitPrice) * BigInt(line.quantity!)
      : 0n;
  }
  protected unitPrice(product: Product) {
    return money(priceUnits(product.unitPrice));
  }
  private async restore() {
    await this.perform(async () => {
      try {
        const user = await this.api.me();
        this.user.set(user);
        if (this.allowed()) await this.loadProducts();
      } catch (error) {
        if (!(error instanceof HttpErrorResponse) || error.status !== 401) throw error;
      }
    });
  }
  private async loadProducts() {
    const products = await this.api.products();
    this.products.set(products);
    const images = await Promise.all(
      products.map(async (product) => {
        const rows = await this.api.images(product.id).catch(() => []);
        return rows[0]
          ? ([
              product.id,
              { url: this.api.base + '/catalog/images/' + rows[0].id, alt: rows[0].altText },
            ] as const)
          : null;
      }),
    );
    this.images.set(Object.fromEntries(images.filter((entry) => entry !== null)));
  }
  protected async login(username: string, input: HTMLInputElement) {
    const password = input.value;
    input.value = '';
    await this.perform(async () => {
      this.user.set(await this.api.login(username, password));
      if (this.allowed()) await this.loadProducts();
    });
  }
  protected async logout() {
    await this.perform(async () => {
      await this.api.logout();
      this.user.set(null);
      this.products.set([]);
      this.images.set({});
      this.cart.set([]);
      this.customerName = '';
      this.contactPhone = '';
      this.receipt.set(null);
      this.query.set('');
      this.category.set('');
    });
  }
  protected async refresh() {
    await this.perform(() => this.loadProducts());
  }
  protected add(product: Product) {
    if (this.busy()) return;
    const existing = this.cart().find((line) => line.productId === product.id);
    if (!existing && this.cart().length >= 100) {
      this.error.set('Use up to 100 different products per order.');
      return;
    }
    const quantity =
      (existing && this.validLine(existing) ? existing.quantity! : 0) +
      product.minimumOrderQuantity;
    if (quantity > 2147483647) {
      this.error.set('Quantity exceeds the supported range.');
      return;
    }
    this.cart.update((lines) =>
      existing
        ? lines.map((line) => (line.productId === product.id ? { ...line, quantity } : line))
        : [...lines, { productId: product.id, quantity }],
    );
    this.message.set(product.name + ' added.');
  }
  protected quantity(productId: string, quantity: number | null) {
    this.cart.update((lines) =>
      lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)),
    );
  }
  protected remove(productId: string) {
    this.cart.update((lines) => lines.filter((line) => line.productId !== productId));
  }
  protected hideImage(id: string) {
    this.images.update((images) => {
      const next = { ...images };
      delete next[id];
      return next;
    });
  }
  protected nextOrder() {
    this.receipt.set(null);
    this.message.set('');
  }
  protected async submit() {
    if (this.invalid() || !this.allowed()) return;
    await this.perform(async () => {
      const receipt = await this.api.submit(this.cart(), this.customerName, this.contactPhone);
      this.receipt.set(receipt);
      this.cart.set([]);
      this.customerName = '';
      this.contactPhone = '';
      this.message.set('Walk-in request saved for review.');
    });
  }
  private async perform(work: () => Promise<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await work();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) this.user.set(null);
      this.error.set(
        error instanceof HttpErrorResponse && typeof error.error?.message === 'string'
          ? error.error.message
          : 'The request could not be completed. Check the API connection and try again.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
