import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface StaffProfile {
  id: string;
  username: string;
  displayName: string;
  role: 'OWNER_ADMIN' | 'CASHIER' | 'PRODUCTION';
}
export interface Product {
  id: string;
  name: string;
  sku: string;
  specificationText: string | null;
  unitPrice: string;
  sellingUnitLabel: string;
  minimumOrderQuantity: number;
  category: { name: string };
}
export interface CartLine {
  productId: string;
  quantity: number | null;
}
export interface WalkInOrder {
  reference: string;
  accessCode: string;
  source: 'WALK_IN';
  status: 'PENDING_REVIEW';
  orderTotal: string;
  items: {
    productName: string;
    productSku: string;
    unitPrice: string;
    quantity: number;
    sellingUnit: string;
  }[];
}
@Injectable({ providedIn: 'root' })
export class PosApi {
  private readonly http = inject(HttpClient);
  readonly base = 'http://localhost:3001/api/v1';
  private readonly credentials = { withCredentials: true, headers: { 'X-Staff-Request': '1' } };
  me() {
    return firstValueFrom(this.http.get<StaffProfile>(this.base + '/staff/me', this.credentials));
  }
  login(username: string, password: string) {
    return firstValueFrom(
      this.http.post<StaffProfile>(
        this.base + '/staff/login',
        { username, password },
        this.credentials,
      ),
    );
  }
  logout() {
    return firstValueFrom(this.http.post<void>(this.base + '/staff/logout', {}, this.credentials));
  }
  products() {
    return firstValueFrom(this.http.get<Product[]>(this.base + '/products'));
  }
  images(id: string) {
    return firstValueFrom(
      this.http.get<{ id: string; altText: string }[]>(
        this.base + '/catalog/products/' + id + '/images',
      ),
    );
  }
  submit(items: CartLine[], customerName: string, contactPhone: string) {
    return firstValueFrom(
      this.http.post<WalkInOrder>(
        this.base + '/pos/orders',
        { items, customerName, contactPhone },
        this.credentials,
      ),
    );
  }
}
