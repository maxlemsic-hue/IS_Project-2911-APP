import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrdersApi, type StaffProfile } from '../orders/orders-api';
import {
  CatalogApi,
  type Product,
  type Category,
  type CatalogAudit,
  type Attribute,
} from './catalog-api';

function emptyProduct() {
  return {
    name: '',
    slug: '',
    categoryId: '',
    description: '',
    specificationText: '',
    unitPrice: '0.00',
    minimumOrderQuantity: 1,
    sellingUnitLabel: 'piece',
    publicationStatus: 'DRAFT',
    isAvailable: false,
    attributes: [] as Attribute[],
  };
}
@Component({
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog {
  private readonly api = inject(CatalogApi);
  private readonly staff = inject(OrdersApi);
  protected readonly user = signal<StaffProfile | null>(null);
  protected readonly products = signal<Product[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly busy = signal(false);
  protected readonly ready = signal(false);
  protected readonly error = signal('');
  protected readonly message = signal('');
  protected readonly query = signal('');
  protected readonly categoryFilter = signal('');
  protected readonly view = signal<'products' | 'categories'>('products');
  protected readonly editor = signal(false);
  protected readonly selected = signal<Product | null>(null);
  protected readonly selectedCategory = signal<Category | null>(null);
  protected readonly auditEntries = signal<CatalogAudit[]>([]);
  protected readonly visible = computed(() =>
    this.products().filter(
      (product) =>
        (!this.categoryFilter() || product.categoryId === this.categoryFilter()) &&
        (product.name.toLowerCase().includes(this.query().toLowerCase()) ||
          product.sku.toLowerCase().includes(this.query().toLowerCase())),
    ),
  );
  protected draft = emptyProduct();
  protected categoryDraft = { name: '', slug: '', description: '', isActive: true, sortOrder: 0 };
  constructor() {
    void this.restore();
  }
  private async restore() {
    await this.perform(async () => {
      const user = await this.staff.me();
      this.user.set(user);
      if (user.role !== 'OWNER_ADMIN')
        throw Error('Product management requires Owner/Admin access.');
      await this.load();
      this.ready.set(true);
    });
  }
  private async load() {
    const [products, categories] = await Promise.all([this.api.products(), this.api.categories()]);
    this.products.set(products);
    this.categories.set(categories);
  }
  protected async refresh() {
    await this.perform(() => this.load());
  }
  protected addProduct() {
    this.selected.set(null);
    this.draft = emptyProduct();
    this.editor.set(true);
    this.auditEntries.set([]);
    this.message.set('');
  }
  protected edit(product: Product) {
    this.selected.set(product);
    this.draft = {
      name: product.name,
      slug: product.slug,
      categoryId: product.categoryId,
      description: product.description || '',
      specificationText: product.specificationText || '',
      unitPrice: product.unitPrice,
      minimumOrderQuantity: product.minimumOrderQuantity,
      sellingUnitLabel: product.sellingUnitLabel,
      publicationStatus: product.publicationStatus,
      isAvailable: product.isAvailable,
      attributes: product.attributes.map(({ key, label, value, unit }) => ({
        key,
        label,
        value,
        unit,
      })),
    };
    this.editor.set(true);
    this.auditEntries.set([]);
    this.message.set('');
  }
  protected slug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  protected async save() {
    await this.perform(async () => {
      const selected = this.selected();
      const saved = await this.api.saveProduct(
        { ...this.draft, ...(selected ? { version: selected.version } : {}) },
        selected?.id,
      );
      await this.load();
      this.edit(saved);
      this.message.set('Product saved.');
    });
  }
  protected async archive() {
    const selected = this.selected();
    if (
      !selected ||
      !window.confirm(
        'Archive this product? It will stop appearing in the storefront. Saved orders will retain their details.',
      )
    )
      return;
    await this.perform(async () => {
      await this.api.archive(selected);
      await this.load();
      this.edit(this.products().find((product) => product.id === selected.id)!);
      this.message.set('Product archived.');
    });
  }
  protected addAttribute() {
    this.draft.attributes.push({ key: '', label: '', value: '', unit: null });
  }
  protected removeAttribute(index: number) {
    this.draft.attributes.splice(index, 1);
  }
  protected newCategory() {
    this.selectedCategory.set(null);
    this.categoryDraft = { name: '', slug: '', description: '', isActive: true, sortOrder: 0 };
    this.auditEntries.set([]);
  }
  protected editCategory(category: Category) {
    this.selectedCategory.set(category);
    this.categoryDraft = {
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    };
    this.auditEntries.set([]);
  }
  protected async saveCategory() {
    await this.perform(async () => {
      const saved = await this.api.saveCategory(this.categoryDraft, this.selectedCategory()?.id);
      await this.load();
      this.editCategory(saved);
      this.message.set('Category saved.');
    });
  }
  protected async archiveCategory() {
    const category = this.selectedCategory();
    if (
      !category ||
      !window.confirm('Archive this category and hide its products from new customer orders?')
    )
      return;
    await this.perform(async () => {
      await this.api.archiveCategory(category.id);
      await this.load();
      this.editCategory(this.categories().find((entry) => entry.id === category.id)!);
      this.message.set('Category archived.');
    });
  }
  protected async upload(fileInput: HTMLInputElement, altInput: HTMLInputElement) {
    const product = this.selected();
    const file = fileInput.files?.[0];
    if (!product || !file || !altInput.reportValidity()) return;
    await this.perform(async () => {
      await this.api.upload(product.id, file, altInput.value);
      await this.load();
      this.edit(this.products().find((entry) => entry.id === product.id)!);
      fileInput.value = '';
      altInput.value = '';
      this.message.set('Image uploaded.');
    });
  }
  protected async removeImage(imageId: string) {
    const product = this.selected();
    if (!product || !window.confirm('Remove this image from the product?')) return;
    await this.perform(async () => {
      await this.api.removeImage(product.id, imageId);
      await this.load();
      this.edit(this.products().find((entry) => entry.id === product.id)!);
      this.message.set('Image removed.');
    });
  }
  protected imageUrl(id: string) {
    return this.api.base + '/images/' + id;
  }
  protected async audit(kind: 'products' | 'categories', id: string) {
    await this.perform(async () => this.auditEntries.set(await this.api.audit(kind, id)));
  }
  private async perform(work: () => Promise<unknown>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.message.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(
        error instanceof HttpErrorResponse
          ? typeof error.error?.message === 'string'
            ? error.error.message
            : 'Catalog could not be loaded. Check the API and catalog migration.'
          : error instanceof Error
            ? error.message
            : 'Catalog action failed.',
      );
    } finally {
      this.busy.set(false);
    }
  }
}
