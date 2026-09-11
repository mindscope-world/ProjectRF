import React, { useEffect, useState } from 'react';
import {
  AdminCategory,
  AdminProduct,
  AdminProductImage,
  adjustAdminInventory,
  addAdminProductImage,
  createAdminCategory,
  createAdminProduct,
  createAdminVariant,
  deleteAdminProductImage,
  deleteAdminVariant,
  fetchAdminCategories,
  fetchAdminProducts,
  updateAdminProduct,
  updateAdminProductImage,
  updateAdminVariant,
  uploadAdminImage,
} from '../adminClient';
import { resolveImageSrc } from '../../components/ProductArtwork';

const STATUSES = ['draft', 'active', 'inactive', 'archived'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---- Category picker (with inline "add new") ---------------------------------

const CategoryPicker: React.FC<{
  categories: AdminCategory[];
  value: string;
  onChange: (slug: string) => void;
  onCategoryCreated: (category: AdminCategory) => void;
}> = ({ categories, value, onChange, onCategoryCreated }) => {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const category = await createAdminCategory(newName.trim(), slugify(newName));
      onCategoryCreated(category);
      onChange(category.slug);
      setAdding(false);
      setNewName('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (adding) {
    return (
      <div className="flex gap-1.5 items-start">
        <div className="flex-1">
          <input
            placeholder="New category name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            autoFocus
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          />
          {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving || !newName.trim()}
          className="px-2 py-1.5 bg-gray-900 text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50"
        >
          {saving ? '…' : 'Add'}
        </button>
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setError(null);
          }}
          className="px-2 py-1.5 border border-gray-300 text-xs font-bold rounded cursor-pointer"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5"
      >
        <option value="">Select category…</option>
        {categories.map((c) => (
          <option key={c.id} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="px-2 py-1.5 border border-gray-300 text-xs font-bold rounded cursor-pointer whitespace-nowrap"
      >
        + New
      </button>
    </div>
  );
};

// ---- Image upload button -------------------------------------------------------

const ImageUploadButton: React.FC<{ label: string; onUploaded: (url: string) => void }> = ({
  label,
  onUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `image-upload-${label.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2)}`;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadAdminImage(file);
      onUploaded(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label
        htmlFor={inputId}
        className="inline-block px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer"
      >
        {uploading ? 'Uploading…' : label}
      </label>
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={uploading}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {error && <p className="text-[10px] text-red-600 mt-1">{error}</p>}
    </div>
  );
};

// ---- Create product ---------------------------------------------------------------

interface DraftVariant {
  quantity: number;
  label: string;
  price: number;
  quantityAvailable: number;
  savingsLabel: string;
}

const emptyVariant = (): DraftVariant => ({ quantity: 10, label: '', price: 0, quantityAvailable: 0, savingsLabel: '' });

const CreateProductForm: React.FC<{
  categories: AdminCategory[];
  onCategoryCreated: (category: AdminCategory) => void;
  onCreated: () => void;
  onCancel: () => void;
}> = ({ categories, onCategoryCreated, onCreated, onCancel }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorySlug, setCategorySlug] = useState('');
  const [region, setRegion] = useState<'usa' | 'eu'>('usa');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [variants, setVariants] = useState<DraftVariant[]>([emptyVariant()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const updateVariant = (index: number, patch: Partial<DraftVariant>) => {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createAdminProduct({
        name,
        slug,
        categorySlug,
        region,
        imageKey: imageUrl || undefined,
        description: description || undefined,
        variants: variants.map((v) => ({
          quantity: v.quantity,
          label: v.label,
          price: String(v.price),
          quantityAvailable: v.quantityAvailable,
          savingsLabel: v.savingsLabel || undefined,
        })),
      });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const canSubmit =
    name && slug && categorySlug && variants.length > 0 && variants.every((v) => v.label && v.price >= 0);

  return (
    <div className="bg-white rounded-lg shadow p-5 mb-4">
      <h3 className="font-bold text-sm text-gray-900 mb-3">New Product</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          />
          <input
            placeholder="Slug"
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 font-mono"
          />
          <CategoryPicker
            categories={categories}
            value={categorySlug}
            onChange={setCategorySlug}
            onCategoryCreated={onCategoryCreated}
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as 'usa' | 'eu')}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          >
            <option value="usa">USA (USD)</option>
            <option value="eu">EU (EUR)</option>
          </select>
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm border border-gray-300 rounded px-2 py-1.5"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Photo</label>
          <div className="flex items-start gap-3">
            <div className="w-24 h-24 shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {imageUrl ? (
                <img src={resolveImageSrc(imageUrl) ?? imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[10px] text-gray-400">No photo</span>
              )}
            </div>
            <ImageUploadButton label={imageUrl ? 'Replace photo' : 'Upload photo'} onUploaded={setImageUrl} />
          </div>
        </div>
      </div>

      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Price range (pack sizes)</h4>
      <div className="space-y-2 mb-3">
        {variants.map((v, i) => (
          <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center">
            <input
              type="number"
              placeholder="Qty"
              value={v.quantity}
              onChange={(e) => updateVariant(i, { quantity: Number(e.target.value) })}
              className="text-sm border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              placeholder="Label (e.g. 10-Pack)"
              value={v.label}
              onChange={(e) => updateVariant(i, { label: e.target.value })}
              className="text-sm border border-gray-300 rounded px-2 py-1.5 md:col-span-2"
            />
            <input
              type="number"
              placeholder="Price"
              value={v.price}
              onChange={(e) => updateVariant(i, { price: Number(e.target.value) })}
              className="text-sm border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              type="number"
              placeholder="Stock"
              value={v.quantityAvailable}
              onChange={(e) => updateVariant(i, { quantityAvailable: Number(e.target.value) })}
              className="text-sm border border-gray-300 rounded px-2 py-1.5"
            />
            <div className="flex gap-1">
              <input
                placeholder="Savings label"
                value={v.savingsLabel}
                onChange={(e) => updateVariant(i, { savingsLabel: e.target.value })}
                className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 min-w-0"
              />
              {variants.length > 1 && (
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  className="px-2 text-red-600 font-bold cursor-pointer"
                  title="Remove tier"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setVariants((prev) => [...prev, emptyVariant()])}
        className="text-xs font-bold text-[#0066cc] cursor-pointer mb-4"
      >
        + Add another pack size
      </button>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={saving || !canSubmit}
          className="px-4 py-1.5 bg-[#fed000] hover:bg-[#ffc800] disabled:opacity-50 text-gray-950 font-bold text-xs rounded cursor-pointer"
        >
          {saving ? 'Creating…' : 'Create product'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-1.5 border border-gray-300 text-xs font-bold rounded cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
};

// ---- Images manager (within a product's Manage panel) ------------------------

const ProductImagesManager: React.FC<{ product: AdminProduct; onChanged: (p: AdminProduct) => void }> = ({
  product,
  onChanged,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);

  const images = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const runOn = async (id: string, action: () => Promise<AdminProduct>) => {
    setBusyId(id);
    try {
      onChanged(await action());
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Photos</h4>
      <div className="flex flex-wrap gap-3 mb-3">
        {images.map((img: AdminProductImage) => (
          <div key={img.id} className="relative w-24">
            <div className="w-24 h-24 bg-gray-100 rounded overflow-hidden border border-amber-100">
              <img
                src={resolveImageSrc(img.url) ?? img.url}
                alt={img.altText ?? ''}
                className="w-full h-full object-cover"
              />
            </div>
            {img.isPrimary && (
              <span className="absolute top-1 left-1 bg-[#fed000] text-gray-950 text-[9px] font-bold px-1 rounded">
                Primary
              </span>
            )}
            <div className="flex gap-1 mt-1">
              {!img.isPrimary && (
                <button
                  type="button"
                  disabled={busyId === img.id}
                  onClick={() =>
                    runOn(img.id, () => updateAdminProductImage(product.id, img.id, { isPrimary: true }))
                  }
                  className="text-[10px] font-bold text-[#0066cc] cursor-pointer disabled:opacity-50"
                >
                  Set primary
                </button>
              )}
              <button
                type="button"
                disabled={busyId === img.id}
                onClick={() => runOn(img.id, () => deleteAdminProductImage(product.id, img.id))}
                className="text-[10px] font-bold text-red-600 cursor-pointer disabled:opacity-50 ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <div className="w-24 h-24 flex items-center justify-center">
          <ImageUploadButton
            label="+ Add photo"
            onUploaded={(url) => runOn('new', () => addAdminProductImage(product.id, { url }))}
          />
        </div>
      </div>
    </div>
  );
};

// ---- Variants / price range manager (within a product's Manage panel) --------

const ProductVariantsManager: React.FC<{ product: AdminProduct; onChanged: (p: AdminProduct) => void }> = ({
  product,
  onChanged,
}) => {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<DraftVariant>(emptyVariant());
  const [error, setError] = useState<string | null>(null);

  const saveStock = async (variantId: string, current: number) => {
    const next = window.prompt('New stock quantity:', String(current));
    if (next === null) return;
    const parsed = Number(next);
    if (Number.isNaN(parsed) || parsed < 0) return;
    setBusyId(variantId);
    try {
      const updatedVariant = await adjustAdminInventory(variantId, parsed);
      onChanged({
        ...product,
        variants: product.variants.map((v) => (v.id === variantId ? { ...v, quantityAvailable: updatedVariant.quantityAvailable } : v)),
      });
    } finally {
      setBusyId(null);
    }
  };

  const editField = async (variantId: string, field: 'label' | 'price', current: string | number) => {
    const next = window.prompt(field === 'price' ? 'New price:' : 'New label:', String(current));
    if (next === null || next === '') return;
    setBusyId(variantId);
    try {
      const payload = field === 'price' ? { price: next } : { label: next };
      onChanged(await updateAdminVariant(product.id, variantId, payload));
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (variantId: string, active: boolean) => {
    setBusyId(variantId);
    try {
      onChanged(await updateAdminVariant(product.id, variantId, { active: !active }));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (variantId: string) => {
    if (!window.confirm('Delete this price tier? This cannot be undone.')) return;
    setBusyId(variantId);
    setError(null);
    try {
      onChanged(await deleteAdminVariant(product.id, variantId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  const submitNew = async () => {
    setBusyId('new');
    setError(null);
    try {
      onChanged(
        await createAdminVariant(product.id, {
          quantity: draft.quantity,
          label: draft.label,
          price: String(draft.price),
          quantityAvailable: draft.quantityAvailable,
          savingsLabel: draft.savingsLabel || undefined,
        })
      );
      setDraft(emptyVariant());
      setAdding(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Price range / pack sizes</h4>
      <table className="w-full text-xs mb-2">
        <thead className="text-left text-gray-500">
          <tr>
            <th className="pb-1">SKU</th>
            <th className="pb-1">Label</th>
            <th className="pb-1">Price</th>
            <th className="pb-1">Available</th>
            <th className="pb-1">Reserved</th>
            <th className="pb-1">Active</th>
            <th className="pb-1"></th>
          </tr>
        </thead>
        <tbody>
          {product.variants.map((v) => (
            <tr key={v.id} className={`border-t border-amber-100 ${busyId === v.id ? 'opacity-50' : ''}`}>
              <td className="py-1.5 font-mono">{v.sku}</td>
              <td className="py-1.5">
                <button type="button" onClick={() => editField(v.id, 'label', v.label)} className="hover:underline cursor-pointer text-left">
                  {v.label}
                </button>
              </td>
              <td className="py-1.5">
                <button type="button" onClick={() => editField(v.id, 'price', v.price)} className="hover:underline cursor-pointer">
                  {v.currency} {v.price.toFixed(2)}
                </button>
              </td>
              <td className="py-1.5">{v.quantityAvailable}</td>
              <td className="py-1.5">{v.quantityReserved}</td>
              <td className="py-1.5">{v.active ? 'Yes' : 'No'}</td>
              <td className="py-1.5 text-right whitespace-nowrap">
                <button type="button" onClick={() => saveStock(v.id, v.quantityAvailable)} className="text-[#0066cc] font-bold cursor-pointer mr-2">
                  Stock
                </button>
                <button type="button" onClick={() => toggleActive(v.id, v.active)} className="text-gray-700 font-bold cursor-pointer mr-2">
                  {v.active ? 'Deactivate' : 'Activate'}
                </button>
                <button type="button" onClick={() => remove(v.id)} className="text-red-600 font-bold cursor-pointer">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && <p className="text-[10px] text-red-600 mb-2">{error}</p>}

      {adding ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-center bg-white p-2 rounded border border-gray-200">
          <input
            type="number"
            placeholder="Qty"
            value={draft.quantity}
            onChange={(e) => setDraft((d) => ({ ...d, quantity: Number(e.target.value) }))}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          />
          <input
            placeholder="Label"
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            className="text-xs border border-gray-300 rounded px-2 py-1 md:col-span-2"
          />
          <input
            type="number"
            placeholder="Price"
            value={draft.price}
            onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          />
          <input
            type="number"
            placeholder="Stock"
            value={draft.quantityAvailable}
            onChange={(e) => setDraft((d) => ({ ...d, quantityAvailable: Number(e.target.value) }))}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={submitNew}
              disabled={busyId === 'new' || !draft.label}
              className="px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded cursor-pointer disabled:opacity-50"
            >
              Save
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-2 py-1 border border-gray-300 text-[10px] font-bold rounded cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="text-xs font-bold text-[#0066cc] cursor-pointer">
          + Add pack size
        </button>
      )}
    </div>
  );
};

// ---- Product row (list + manage panel) ---------------------------------------

const ProductRow: React.FC<{
  product: AdminProduct;
  categories: AdminCategory[];
  onCategoryCreated: (category: AdminCategory) => void;
  onChanged: (p: AdminProduct) => void;
}> = ({ product, categories, onCategoryCreated, onChanged }) => {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description ?? '');
  const [categorySlug, setCategorySlug] = useState(product.categorySlug);
  const [status, setStatus] = useState(product.status);
  const [isBestSeller, setIsBestSeller] = useState(product.isBestSeller);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveDetails = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateAdminProduct(product.id, {
        name,
        description: description || null,
        categorySlug,
        status,
        isBestSeller,
      });
      onChanged(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="p-3 font-semibold">{product.name}</td>
        <td className="p-3 font-mono text-xs text-gray-500">{product.slug}</td>
        <td className="p-3">{product.categorySlug}</td>
        <td className="p-3">{product.region}</td>
        <td className="p-3">{product.status}</td>
        <td className="p-3">{product.isBestSeller ? '★' : ''}</td>
        <td className="p-3 text-right">
          <button type="button" onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-[#0066cc] cursor-pointer">
            {expanded ? 'Close' : 'Manage'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-amber-50/40">
          <td colSpan={7} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full text-xs border border-gray-300 rounded px-2 py-1.5"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Category</label>
                  <CategoryPicker
                    categories={categories}
                    value={categorySlug}
                    onChange={setCategorySlug}
                    onCategoryCreated={onCategoryCreated}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full text-xs border border-gray-300 rounded px-2 py-1.5">
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <input type="checkbox" checked={isBestSeller} onChange={(e) => setIsBestSeller(e.target.checked)} />
                    Best seller
                  </label>
                </div>
                {error && <p className="text-xs text-red-600">{error}</p>}
                <button type="button" onClick={saveDetails} disabled={saving} className="px-4 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded cursor-pointer disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save details'}
                </button>
              </div>
            </div>

            <div className="mb-5">
              <ProductImagesManager product={product} onChanged={onChanged} />
            </div>

            <ProductVariantsManager product={product} onChanged={onChanged} />
          </td>
        </tr>
      )}
    </>
  );
};

export const ProductsSection: React.FC = () => {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    fetchAdminProducts({ region: region || undefined, status: status || undefined, search: search || undefined, limit: 100 })
      .then((res) => {
        setProducts(res.items);
        setTotal(res.meta.total);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [region, status]);
  useEffect(() => {
    fetchAdminCategories().then(setCategories);
  }, []);

  const onCategoryCreated = (category: AdminCategory) => setCategories((prev) => [...prev, category]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-gray-900">Products ({total})</h2>
        <button type="button" onClick={() => setShowCreate(!showCreate)} className="text-sm bg-[#fed000] hover:bg-[#ffc800] px-3 py-1.5 rounded font-bold cursor-pointer">
          {showCreate ? 'Close' : '+ New Product'}
        </button>
      </div>

      {showCreate && (
        <CreateProductForm
          categories={categories}
          onCategoryCreated={onCategoryCreated}
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        <input placeholder="Search name or slug…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} className="text-sm border border-gray-300 rounded px-3 py-1.5" />
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All regions</option>
          <option value="usa">USA</option>
          <option value="eu">EU</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="text-sm border border-gray-300 rounded px-2 py-1.5">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} className="text-sm bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded font-bold cursor-pointer">
          Search
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Category</th>
              <th className="p-3">Region</th>
              <th className="p-3">Status</th>
              <th className="p-3">Best Seller</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={7} className="p-4 text-center text-gray-400">
                  No products found.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                categories={categories}
                onCategoryCreated={onCategoryCreated}
                onChanged={(updated) => setProducts((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
