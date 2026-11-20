import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  archivedAt: string | null;
}
export interface Attribute {
  key: string;
  label: string;
  value: string;
  unit: string | null;
}
export interface ProductImage {
  id: string;
  altText: string;
}
export interface Product {
  id: string;
  sku: string;
  version: number;
  name: string;
  slug: string;
  categoryId: string;
  description: string | null;
  specificationText: string | null;
  unitPrice: string;
  minimumOrderQuantity: number;
  sellingUnitLabel: string;
  publicationStatus: string;
  isAvailable: boolean;
  archivedAt: string | null;
  category: Category;
  attributes: Attribute[];
  images: ProductImage[];
}
export interface CatalogAudit {
  id: string;
  action: string;
  occurredAt: string;
  staffUser: { username: string; displayName: string };
}
@Injectable({ providedIn: 'root' })
export class CatalogApi {
  private readonly http = inject(HttpClient);
  readonly base = 'http://localhost:3001/api/v1/admin/catalog';
  private readonly credentials = { withCredentials: true, headers: { 'X-Staff-Request': '1' } };
  products() {
    return firstValueFrom(this.http.get<Product[]>(this.base + '/products', this.credentials));
  }
  categories() {
    return firstValueFrom(this.http.get<Category[]>(this.base + '/categories', this.credentials));
  }
  saveProduct(body: unknown, id?: string) {
    return firstValueFrom(
      id
        ? this.http.patch<Product>(this.base + '/products/' + id, body, this.credentials)
        : this.http.post<Product>(this.base + '/products', body, this.credentials),
    );
  }
  archive(product: Product) {
    return firstValueFrom(
      this.http.patch(
        this.base + '/products/' + product.id + '/archive',
        { version: product.version },
        this.credentials,
      ),
    );
  }
  saveCategory(body: unknown, id?: string) {
    return firstValueFrom(
      id
        ? this.http.patch<Category>(this.base + '/categories/' + id, body, this.credentials)
        : this.http.post<Category>(this.base + '/categories', body, this.credentials),
    );
  }
  archiveCategory(id: string) {
    return firstValueFrom(
      this.http.patch(this.base + '/categories/' + id + '/archive', {}, this.credentials),
    );
  }
  upload(id: string, file: File, altText: string) {
    const data = new FormData();
    data.append('image', file);
    data.append('altText', altText);
    return firstValueFrom(
      this.http.post(this.base + '/products/' + id + '/images', data, this.credentials),
    );
  }
  removeImage(productId: string, imageId: string) {
    return firstValueFrom(
      this.http.delete(
        this.base + '/products/' + productId + '/images/' + imageId,
        this.credentials,
      ),
    );
  }
  audit(kind: 'products' | 'categories', id: string) {
    return firstValueFrom(
      this.http.get<CatalogAudit[]>(this.base + '/' + kind + '/' + id + '/audit', this.credentials),
    );
  }
}
