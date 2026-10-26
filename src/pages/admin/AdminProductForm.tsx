import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../../components/ui';
import { useToast } from '../../components/Toast';
import { AdminCard, AdminField, PageTitle, adminInput as input, koboToNaira, nairaToKobo, slugify } from './AdminLayout';
import { requireSupabase, friendlyError } from '../../lib/supabase';
import { formatNaira } from '../../lib/money';
import { usePageMeta } from '../../lib/seo';
import { useAuth } from '../../context/AuthContext';

type Option = { id: string; name: string; slug?: string };
type Spec = { key: string; value: string };
type VariantDraft = { id?: string; sku: string; name: string; ram: string; storage: string; colour: string; processor: string; price: string; sale: string; stock: number; initialStock: string; is_active: boolean; remove?: boolean };
type ImageDraft = { id?: string; url: string; alt: string; path?: string; remove?: boolean };

const blank = {
  name: '', slug: '', sku: '', type: 'physical' as 'physical' | 'downloadable' | 'software', category_id: '', brand_id: '', newBrand: '',
  short_description: '', description: '', price: '', sale: '', sale_starts_at: '', sale_ends_at: '',
  condition: 'new' as '' | 'new' | 'used' | 'refurbished', condition_notes: '', warranty_months: '', warranty_notes: '',
  licence_type: '', licence_duration_months: '', licence_source: '', system_requirements: '', delivery_notes: '',
  low_stock_threshold: '3', is_featured: false, status: 'draft' as 'draft' | 'published' | 'archived', seo_title: '', seo_description: '',
  stock: null as number | null, initialStock: '',
};
const SPEC_KEYS = ['Processor', 'RAM', 'Storage', 'Display', 'Graphics', 'Operating system', 'Battery', 'Weight', 'Colour'];

/** Shrink large photos in the browser before upload (max 1600px, WebP). */
async function prepareImage(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('Use JPG, PNG, WebP or AVIF images.');
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.86));
  if (!blob) return file;
  if (blob.size > 5 * 1024 * 1024) throw new Error('That image is over 5MB even after compressing. Use a smaller photo.');
  return blob;
}

export default function AdminProductForm() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  usePageMeta(isNew ? 'Add product · Admin' : 'Edit product · Admin', 'Product editor.');
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const sb = requireSupabase();

  const [f, setF] = useState({ ...blank });
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adjust, setAdjust] = useState<{ variantId: string | null; qty: string; reason: 'restock' | 'adjustment' | 'damaged' | 'return'; note: string } | null>(null);

  const set = <K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) => { setF((p) => ({ ...p, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };

  const load = async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      sb.from('categories').select('id, name').order('sort_order'),
      sb.from('brands').select('id, name, slug').order('name'),
    ]);
    setCategories((c.data ?? []) as Option[]); setBrands((b.data ?? []) as Option[]);
    if (isNew) { setF((p) => ({ ...p, category_id: c.data?.[0]?.id ?? '' })); setLoading(false); return; }
    const [p, v, i] = await Promise.all([
      sb.from('products').select('*').eq('id', id!).single(),
      sb.from('product_variants').select('*').eq('product_id', id!).order('sort_order'),
      sb.from('product_images').select('*').eq('product_id', id!).order('sort_order'),
    ]);
    if (p.error) { setLoadError(friendlyError(p.error, 'This product could not be loaded.')); setLoading(false); return; }
    const d = p.data;
    setF({
      ...blank, name: d.name, slug: d.slug, sku: d.sku, type: d.type, category_id: d.category_id, brand_id: d.brand_id ?? '',
      short_description: d.short_description ?? '', description: d.description ?? '', price: koboToNaira(d.price_kobo), sale: koboToNaira(d.sale_price_kobo),
      sale_starts_at: d.sale_starts_at?.slice(0, 10) ?? '', sale_ends_at: d.sale_ends_at?.slice(0, 10) ?? '',
      condition: d.condition ?? '', condition_notes: d.condition_notes ?? '', warranty_months: d.warranty_months?.toString() ?? '', warranty_notes: d.warranty_notes ?? '',
      licence_type: d.licence_type ?? '', licence_duration_months: d.licence_duration_months?.toString() ?? '', licence_source: d.licence_source ?? '',
      system_requirements: d.system_requirements ?? '', delivery_notes: d.delivery_notes ?? '', low_stock_threshold: String(d.low_stock_threshold),
      is_featured: d.is_featured, status: d.status, seo_title: d.seo_title ?? '', seo_description: d.seo_description ?? '', stock: d.stock,
    });
    setSlugTouched(true);
    setSpecs(Object.entries((d.specs ?? {}) as Record<string, string>).map(([key, value]) => ({ key, value: String(value) })));
    setVariants((v.data ?? []).map((x) => {
      const a = (x.attributes ?? {}) as Record<string, string>;
      return { id: x.id, sku: x.sku, name: x.name, ram: a.RAM ?? '', storage: a.Storage ?? '', colour: a.Colour ?? '', processor: a.Processor ?? '',
        price: koboToNaira(x.price_kobo), sale: koboToNaira(x.sale_price_kobo), stock: x.stock, initialStock: '', is_active: x.is_active };
    }));
    setImages((i.data ?? []).map((x) => ({ id: x.id, url: x.url, alt: x.alt })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const blob = await prepareImage(file);
        const path = `products/${crypto.randomUUID()}.${blob.type === 'image/webp' ? 'webp' : file.name.split('.').pop()}`;
        const up = await sb.storage.from('product-images').upload(path, blob, { contentType: blob.type || file.type, upsert: false });
        if (up.error) throw up.error;
        const url = sb.storage.from('product-images').getPublicUrl(path).data.publicUrl;
        setImages((prev) => [...prev, { url, path, alt: f.name ? `${f.name} photo ${prev.filter((x) => !x.remove).length + 1}` : '' }]);
      }
    } catch (e) { toast((e as Error).message || 'Upload failed. Try again.'); }
    setUploading(false);
  };

  const moveImage = (i: number, d: -1 | 1) => setImages((prev) => {
    const vis = prev.filter((x) => !x.remove); const hidden = prev.filter((x) => x.remove);
    const j = i + d; if (j < 0 || j >= vis.length) return prev;
    [vis[i], vis[j]] = [vis[j], vis[i]]; return [...vis, ...hidden];
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (f.name.trim().length < 2) e.name = 'Enter the product name.';
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) e.slug = 'Use lowercase letters, numbers and dashes.';
    if (f.sku.trim().length < 2) e.sku = 'Enter a unique SKU.';
    if (!f.category_id) e.category_id = 'Choose a category.';
    const price = nairaToKobo(f.price);
    if (price === null || Number.isNaN(price)) e.price = 'Enter the price in naira, e.g. 100000.';
    const sale = nairaToKobo(f.sale);
    if (Number.isNaN(sale)) e.sale = 'Enter a number or leave blank.';
    else if (sale !== null && price !== null && sale >= price) e.sale = 'Sale price must be lower than the price.';
    if (f.type === 'physical' && !f.condition) e.condition = 'Choose a condition.';
    if (f.type === 'physical' && f.condition && f.condition !== 'new' && f.condition_notes.trim().length < 10) e.condition_notes = 'Describe the condition for used or refurbished items (at least a short sentence).';
    if (f.newBrand && f.newBrand.trim().length < 1) e.brand_id = 'Enter a brand name.';
    variants.filter((v) => !v.remove).forEach((v, i) => {
      if (!v.sku.trim() || !v.name.trim()) e[`variant-${i}`] = 'Each option needs a name and SKU.';
      const vp = nairaToKobo(v.price), vs = nairaToKobo(v.sale);
      if (Number.isNaN(vp) || Number.isNaN(vs)) e[`variant-${i}`] = 'Option prices must be numbers.';
      else if (vs !== null && (vp ?? price ?? 0) <= vs) e[`variant-${i}`] = 'Option sale price must be lower than its price.';
    });
    if (images.some((im) => !im.remove && im.alt.trim().length < 3)) e.images = 'Describe each photo in a few words (used by screen readers and Google).';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) { toast('Fix the highlighted fields.'); return; }
    setSaving(true);
    try {
      let brandId = f.brand_id || null;
      if (f.brand_id === '__new' && f.newBrand.trim()) {
        const name = f.newBrand.trim();
        const { data, error } = await sb.from('brands').upsert({ name, slug: slugify(name) }, { onConflict: 'slug' }).select('id').single();
        if (error) throw error; brandId = data.id;
      } else if (f.brand_id === '__new') brandId = null;

      const specsObj = Object.fromEntries(specs.filter((s) => s.key.trim() && s.value.trim()).map((s) => [s.key.trim(), s.value.trim()]));
      const physical = f.type === 'physical';
      const row = {
        name: f.name.trim(), slug: f.slug, sku: f.sku.trim().toUpperCase(), type: f.type, category_id: f.category_id, brand_id: brandId,
        short_description: f.short_description.trim() || null, description: f.description.trim() || null,
        price_kobo: nairaToKobo(f.price)!, sale_price_kobo: nairaToKobo(f.sale),
        sale_starts_at: f.sale_starts_at ? new Date(`${f.sale_starts_at}T00:00:00+01:00`).toISOString() : null,
        sale_ends_at: f.sale_ends_at ? new Date(`${f.sale_ends_at}T23:59:59+01:00`).toISOString() : null,
        condition: physical ? f.condition || null : null, condition_notes: physical && f.condition !== 'new' ? f.condition_notes.trim() || null : null,
        warranty_months: f.warranty_months ? Number(f.warranty_months) : null, warranty_notes: f.warranty_notes.trim() || null,
        licence_type: f.type === 'software' ? f.licence_type.trim() || null : null,
        licence_duration_months: f.type === 'software' && f.licence_duration_months ? Number(f.licence_duration_months) : null,
        licence_source: f.type === 'software' ? f.licence_source.trim() || null : null,
        system_requirements: f.type !== 'physical' ? f.system_requirements.trim() || null : null,
        delivery_notes: f.delivery_notes.trim() || null, low_stock_threshold: Number(f.low_stock_threshold) || 0,
        is_featured: f.is_featured, status: f.status, specs: specsObj, seo_title: f.seo_title.trim() || null, seo_description: f.seo_description.trim() || null,
        ...(isNew && !physical ? { stock: null } : {}),
      };

      let productId = id!;
      if (isNew) {
        const { data, error } = await sb.from('products').insert(row).select('id').single();
        if (error) throw error;
        productId = data.id;
      } else {
        const { error } = await sb.from('products').update(row).eq('id', productId);
        if (error) throw error;
      }

      // Options (variants)
      let order = 0;
      for (const v of variants) {
        const attrs = Object.fromEntries(Object.entries({ RAM: v.ram, Storage: v.storage, Colour: v.colour, Processor: v.processor }).filter(([, x]) => x.trim()));
        const vrow = { sku: v.sku.trim().toUpperCase(), name: v.name.trim(), attributes: attrs, price_kobo: nairaToKobo(v.price), sale_price_kobo: nairaToKobo(v.sale), is_active: v.is_active, sort_order: order };
        if (v.remove && v.id) {
          const del = await sb.from('product_variants').delete().eq('id', v.id);
          if (del.error) await sb.from('product_variants').update({ is_active: false }).eq('id', v.id); // has history: hide instead
          continue;
        }
        if (v.remove) continue;
        order++;
        if (v.id) {
          const { error } = await sb.from('product_variants').update(vrow).eq('id', v.id);
          if (error) throw error;
        } else {
          const { data, error } = await sb.from('product_variants').insert({ ...vrow, product_id: productId, stock: 0 }).select('id').single();
          if (error) throw error;
          const qty = Number(v.initialStock);
          if (qty > 0) await sb.from('inventory_movements').insert({ product_id: productId, variant_id: data.id, change: qty, reason: 'initial', note: 'Opening stock', created_by: user!.id });
        }
      }

      // Opening stock for a new product without options
      if (isNew && physical && !variants.some((v) => !v.remove) && Number(f.initialStock) > 0) {
        const { error } = await sb.from('inventory_movements').insert({ product_id: productId, change: Number(f.initialStock), reason: 'initial', note: 'Opening stock', created_by: user!.id });
        if (error) throw error;
      }

      // Photos
      let pos = 0;
      for (const im of images) {
        if (im.remove) {
          if (im.id) await sb.from('product_images').delete().eq('id', im.id);
          const path = im.path ?? (im.url.includes('/product-images/') ? im.url.split('/product-images/')[1] : null);
          if (path) await sb.storage.from('product-images').remove([path]);
          continue;
        }
        if (im.id) await sb.from('product_images').update({ alt: im.alt.trim(), sort_order: pos }).eq('id', im.id);
        else await sb.from('product_images').insert({ product_id: productId, url: im.url, alt: im.alt.trim(), sort_order: pos });
        pos++;
      }

      toast(isNew ? 'Product created' : 'Product saved');
      if (isNew) navigate(`/admin/products/${productId}`, { replace: true }); else void load();
    } catch (e) {
      const msg = (e as { message?: string; code?: string });
      toast(msg.code === '23505' ? 'That SKU or web address is already used by another product.' : friendlyError(e, `Save failed: ${msg.message ?? 'try again'}`));
    }
    setSaving(false);
  };

  const applyAdjust = async () => {
    if (!adjust) return;
    const qty = Number(adjust.qty);
    if (!Number.isInteger(qty) || qty === 0) { toast('Enter a whole number, e.g. 5 to add or -2 to remove.'); return; }
    const change = adjust.reason === 'damaged' ? -Math.abs(qty) : adjust.reason === 'restock' || adjust.reason === 'return' ? Math.abs(qty) : qty;
    const { error } = await sb.from('inventory_movements').insert({ product_id: id!, variant_id: adjust.variantId, change, reason: adjust.reason, note: adjust.note.trim() || null, created_by: user!.id });
    if (error) { toast(error.code === '23514' ? 'Stock can’t go below zero.' : friendlyError(error, 'Stock update failed.')); return; }
    toast('Stock updated'); setAdjust(null); void load();
  };

  const remove = async () => {
    const paths = images.map((im) => im.path ?? (im.url.includes('/product-images/') ? im.url.split('/product-images/')[1] : null)).filter(Boolean) as string[];
    const { data, error } = await sb.rpc('admin_delete_product', { p_product_id: id });
    if (error) { toast(friendlyError(error, 'Delete failed.')); return; }
    if (data === 'deleted' && paths.length) await sb.storage.from('product-images').remove(paths);
    toast(data === 'archived' ? 'This product has orders, so it was archived (hidden) instead of deleted.' : 'Product deleted');
    navigate('/admin/products', { replace: true });
  };

  if (loading) return <p className="text-muted" aria-busy="true">Loading…</p>;
  if (loadError) return <p role="alert" className="text-muted">{loadError} <Link to="/admin/products" className="underline">Back to products</Link></p>;

  const liveVariants = variants.filter((v) => !v.remove);
  const visibleImages = images.filter((x) => !x.remove);
  const err = (k: string) => errors[k];

  return (
    <form onSubmit={save} noValidate>
      <PageTitle title={isNew ? 'Add product' : f.name || 'Edit product'}
        intro={isNew ? 'Fill in the details, then save. Drafts stay hidden until you publish.' : `SKU ${f.sku}`}
        action={!isNew && f.status === 'published' ? <a href={`/store/product/${f.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep hover:underline"><ExternalLink className="h-4 w-4" />View in store</a> : undefined} />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <AdminCard title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField id="pf-name" label="Product name *" error={err('name')} className="sm:col-span-2">
                <input id="pf-name" value={f.name} onChange={(e) => { set('name', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} className={input} aria-invalid={!!err('name')} />
              </AdminField>
              <AdminField id="pf-sku" label="SKU *" error={err('sku')} hint="Your unique code, e.g. HP-CB11G8-EE">
                <input id="pf-sku" value={f.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} className={input} aria-invalid={!!err('sku')} />
              </AdminField>
              <AdminField id="pf-slug" label="Web address *" error={err('slug')} hint={`/store/product/${f.slug || '…'}`}>
                <input id="pf-slug" value={f.slug} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} className={input} aria-invalid={!!err('slug')} />
              </AdminField>
              <AdminField id="pf-type" label="Product type *">
                <select id="pf-type" value={f.type} onChange={(e) => { const t = e.target.value as typeof f.type; set('type', t); set('condition', t === 'physical' ? 'new' : ''); }} className={input}>
                  <option value="physical">Hardware (physical item)</option><option value="downloadable">Download (file)</option><option value="software">Software licence</option>
                </select>
              </AdminField>
              <AdminField id="pf-cat" label="Category *" error={err('category_id')}>
                <select id="pf-cat" value={f.category_id} onChange={(e) => set('category_id', e.target.value)} className={input}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </AdminField>
              <AdminField id="pf-brand" label="Brand" error={err('brand_id')}>
                <select id="pf-brand" value={f.brand_id} onChange={(e) => set('brand_id', e.target.value)} className={input}>
                  <option value="">No brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  <option value="__new">+ Add a new brand…</option>
                </select>
              </AdminField>
              {f.brand_id === '__new' && (
                <AdminField id="pf-newbrand" label="New brand name"><input id="pf-newbrand" value={f.newBrand} onChange={(e) => set('newBrand', e.target.value)} className={input} /></AdminField>
              )}
              <AdminField id="pf-short" label="Short description" hint="One line shown on product cards." className="sm:col-span-2">
                <input id="pf-short" maxLength={300} value={f.short_description} onChange={(e) => set('short_description', e.target.value)} className={input} />
              </AdminField>
              <AdminField id="pf-desc" label="Full description" hint="Shown on the product page. Line breaks are kept." className="sm:col-span-2">
                <textarea id="pf-desc" rows={6} value={f.description} onChange={(e) => set('description', e.target.value)} className={input} />
              </AdminField>
            </div>
          </AdminCard>

          <AdminCard title="Photos" action={
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-btn bg-ink px-3.5 py-2 text-sm font-semibold text-white hover:bg-ink-soft ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />{uploading ? 'Uploading…' : 'Add photos'}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => { void onFiles(e.target.files); e.target.value = ''; }} />
            </label>}>
            {visibleImages.length === 0 ? <p className="text-sm text-muted">No photos yet. The first photo is the one shown on product cards. Photos are resized to 1600px automatically.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {visibleImages.map((im, i) => (
                  <li key={im.url} className="flex gap-3 rounded-btn border border-paper-line p-2.5">
                    <img src={im.url} alt="" className="h-20 w-20 shrink-0 rounded-md bg-paper-grey object-contain mix-blend-multiply" />
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor={`img-alt-${i}`}>Photo description</label>
                      <input id={`img-alt-${i}`} value={im.alt} placeholder="Describe the photo" onChange={(e) => setImages((prev) => prev.map((x) => (x === im ? { ...x, alt: e.target.value } : x)))} className={`${input} !py-1.5 text-sm`} />
                      <div className="mt-1.5 flex items-center gap-1">
                        {i === 0 && <span className="mr-auto rounded bg-brand-tint px-1.5 text-xs font-semibold text-brand-deep">Main photo</span>}
                        <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="ml-auto grid h-7 w-7 place-items-center rounded hover:bg-paper-grey disabled:opacity-30" aria-label="Move earlier"><ArrowUp className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => moveImage(i, 1)} disabled={i === visibleImages.length - 1} className="grid h-7 w-7 place-items-center rounded hover:bg-paper-grey disabled:opacity-30" aria-label="Move later"><ArrowDown className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => setImages((prev) => prev.map((x) => (x === im ? { ...x, remove: true } : x)))} className="grid h-7 w-7 place-items-center rounded text-[#B42318] hover:bg-[#FEF3F2]" aria-label="Remove photo"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {err('images') && <p className="mt-2 text-[0.8rem] text-[#B42318]">{err('images')}</p>}
          </AdminCard>

          <AdminCard title="Price">
            <div className="grid gap-4 sm:grid-cols-2">
              <AdminField id="pf-price" label="Price (₦) *" error={err('price')}><input id="pf-price" inputMode="decimal" value={f.price} onChange={(e) => set('price', e.target.value)} className={`${input} tabular-nums`} placeholder="100000" aria-invalid={!!err('price')} /></AdminField>
              <AdminField id="pf-sale" label="Sale price (₦)" error={err('sale')} hint="Leave blank if not on sale."><input id="pf-sale" inputMode="decimal" value={f.sale} onChange={(e) => set('sale', e.target.value)} className={`${input} tabular-nums`} aria-invalid={!!err('sale')} /></AdminField>
              {f.sale && <>
                <AdminField id="pf-ss" label="Sale starts" hint="Blank = now"><input id="pf-ss" type="date" value={f.sale_starts_at} onChange={(e) => set('sale_starts_at', e.target.value)} className={input} /></AdminField>
                <AdminField id="pf-se" label="Sale ends" hint="Blank = until removed"><input id="pf-se" type="date" value={f.sale_ends_at} onChange={(e) => set('sale_ends_at', e.target.value)} className={input} /></AdminField>
              </>}
            </div>
            {f.price && !Number.isNaN(nairaToKobo(f.price)) && nairaToKobo(f.price) !== null && <p className="mt-3 text-sm text-muted">Customers see <strong className="text-ink">{formatNaira(nairaToKobo(f.sale) && !Number.isNaN(nairaToKobo(f.sale)) ? nairaToKobo(f.sale)! : nairaToKobo(f.price)!)}</strong></p>}
          </AdminCard>

          {f.type === 'physical' && (
            <AdminCard title="Condition and warranty">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField id="pf-cond" label="Condition *" error={err('condition')}>
                  <select id="pf-cond" value={f.condition} onChange={(e) => set('condition', e.target.value as typeof f.condition)} className={input}><option value="new">New</option><option value="refurbished">Refurbished</option><option value="used">Used</option></select>
                </AdminField>
                <AdminField id="pf-wm" label="Warranty (months)" hint="0 = no warranty"><input id="pf-wm" inputMode="numeric" value={f.warranty_months} onChange={(e) => set('warranty_months', e.target.value.replace(/\D/g, ''))} className={input} /></AdminField>
                {f.condition !== 'new' && (
                  <AdminField id="pf-cn" label="Condition notes *" error={err('condition_notes')} hint="Shown prominently to buyers: marks, battery health, what’s included." className="sm:col-span-2">
                    <textarea id="pf-cn" rows={2} value={f.condition_notes} onChange={(e) => set('condition_notes', e.target.value)} className={input} aria-invalid={!!err('condition_notes')} />
                  </AdminField>
                )}
                <AdminField id="pf-wn" label="Warranty notes" className="sm:col-span-2"><input id="pf-wn" value={f.warranty_notes} onChange={(e) => set('warranty_notes', e.target.value)} className={input} /></AdminField>
              </div>
            </AdminCard>
          )}

          {f.type === 'software' && (
            <AdminCard title="Licence">
              <div className="grid gap-4 sm:grid-cols-2">
                <AdminField id="pf-lt" label="Licence type" hint="e.g. Retail, 1 PC"><input id="pf-lt" value={f.licence_type} onChange={(e) => set('licence_type', e.target.value)} className={input} /></AdminField>
                <AdminField id="pf-ld" label="Licence length (months)" hint="Blank = perpetual"><input id="pf-ld" inputMode="numeric" value={f.licence_duration_months} onChange={(e) => set('licence_duration_months', e.target.value.replace(/\D/g, ''))} className={input} /></AdminField>
                <AdminField id="pf-ls" label="Licence source (internal)" hint="Where the licence comes from. Only sell licences you are authorised to sell." className="sm:col-span-2"><input id="pf-ls" value={f.licence_source} onChange={(e) => set('licence_source', e.target.value)} className={input} /></AdminField>
              </div>
            </AdminCard>
          )}
          {f.type !== 'physical' && (
            <AdminCard title="Requirements">
              <AdminField id="pf-sr" label="System requirements"><textarea id="pf-sr" rows={3} value={f.system_requirements} onChange={(e) => set('system_requirements', e.target.value)} className={input} /></AdminField>
            </AdminCard>
          )}

          <AdminCard title="Specifications" action={<button type="button" onClick={() => setSpecs((s) => [...s, { key: SPEC_KEYS.find((k) => !s.some((x) => x.key === k)) ?? '', value: '' }])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep"><Plus className="h-4 w-4" />Add row</button>}>
            {specs.length === 0 ? <p className="text-sm text-muted">Add rows like Processor, RAM, Storage, Display. They appear as a table on the product page.</p> : (
              <ul className="space-y-2">
                {specs.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <input aria-label="Specification name" list="spec-keys" value={s.key} onChange={(e) => setSpecs((p) => p.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} className={`${input} w-40 shrink-0 sm:w-48`} placeholder="Name" />
                    <input aria-label="Specification value" value={s.value} onChange={(e) => setSpecs((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className={input} placeholder="Value" />
                    <button type="button" onClick={() => setSpecs((p) => p.filter((_, j) => j !== i))} className="grid w-10 shrink-0 place-items-center rounded-btn text-muted hover:bg-paper-grey" aria-label="Remove row"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <datalist id="spec-keys">{SPEC_KEYS.map((k) => <option key={k} value={k} />)}</datalist>
          </AdminCard>

          {f.type === 'physical' && (
            <AdminCard title="Options (variants)" action={<button type="button" onClick={() => setVariants((v) => [...v, { sku: `${f.sku}-${v.length + 1}`, name: '', ram: '', storage: '', colour: '', processor: '', price: '', sale: '', stock: 0, initialStock: '', is_active: true }])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep"><Plus className="h-4 w-4" />Add option</button>}>
              <p className="mb-3 text-sm text-muted">Use options when the same product comes in different RAM, storage or colours. Each option has its own SKU and stock. Leave option price blank to use the product price.</p>
              {liveVariants.length === 0 ? null : (
                <ul className="space-y-3">
                  {variants.map((v, i) => v.remove ? null : (
                    <li key={v.id ?? `new-${i}`} className="rounded-btn border border-paper-line p-3">
                      <div className="grid gap-2 sm:grid-cols-4">
                        <input aria-label="Option name" value={v.name} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={`${input} sm:col-span-2`} placeholder="Option name, e.g. 8GB / 256GB SSD" />
                        <input aria-label="Option SKU" value={v.sku} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, sku: e.target.value.toUpperCase() } : x)))} className={input} placeholder="SKU" />
                        <div className="flex items-center justify-between gap-2 text-sm">
                          {v.id ? <span className="tabular-nums">Stock <strong>{v.stock}</strong></span> : <input aria-label="Opening stock" inputMode="numeric" value={v.initialStock} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, initialStock: e.target.value.replace(/\D/g, '') } : x)))} className={input} placeholder="Opening stock" />}
                        </div>
                        <input aria-label="RAM" value={v.ram} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, ram: e.target.value } : x)))} className={input} placeholder="RAM" />
                        <input aria-label="Storage" value={v.storage} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, storage: e.target.value } : x)))} className={input} placeholder="Storage" />
                        <input aria-label="Colour" value={v.colour} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, colour: e.target.value } : x)))} className={input} placeholder="Colour" />
                        <input aria-label="Processor" value={v.processor} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, processor: e.target.value } : x)))} className={input} placeholder="Processor" />
                        <input aria-label="Option price in naira" inputMode="decimal" value={v.price} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className={input} placeholder="Price ₦ (optional)" />
                        <input aria-label="Option sale price in naira" inputMode="decimal" value={v.sale} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, sale: e.target.value } : x)))} className={input} placeholder="Sale ₦ (optional)" />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.is_active} onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, is_active: e.target.checked } : x)))} className="accent-[#4CB748]" />On sale in store</label>
                        <div className="flex justify-end gap-2">
                          {v.id && <button type="button" onClick={() => setAdjust({ variantId: v.id!, qty: '', reason: 'restock', note: '' })} className="text-sm font-semibold text-brand-deep">Adjust stock</button>}
                          <button type="button" onClick={() => setVariants((p) => p.map((x, j) => (j === i ? { ...x, remove: true } : x)))} className="text-sm font-semibold text-[#B42318]">Remove</button>
                        </div>
                      </div>
                      {err(`variant-${i}`) && <p className="mt-1 text-[0.8rem] text-[#B42318]">{err(`variant-${i}`)}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </AdminCard>
          )}

          <AdminCard title="Search engines">
            <div className="grid gap-4">
              <AdminField id="pf-st" label="Page title" hint="Leave blank to use the product name."><input id="pf-st" maxLength={70} value={f.seo_title} onChange={(e) => set('seo_title', e.target.value)} className={input} /></AdminField>
              <AdminField id="pf-sd" label="Description" hint="Leave blank to use the short description. Around 150 characters."><textarea id="pf-sd" rows={2} maxLength={300} value={f.seo_description} onChange={(e) => set('seo_description', e.target.value)} className={input} /></AdminField>
            </div>
          </AdminCard>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <AdminCard title="Publishing">
            <AdminField id="pf-status" label="Status">
              <select id="pf-status" value={f.status} onChange={(e) => set('status', e.target.value as typeof f.status)} className={input}>
                <option value="draft">Draft (hidden)</option><option value="published">Published (visible in store)</option><option value="archived">Archived (hidden)</option>
              </select>
            </AdminField>
            <label className="mt-4 flex items-center gap-2.5 text-sm"><input type="checkbox" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} className="h-4 w-4 accent-[#4CB748]" />Feature on the homepage</label>
            <Button type="submit" disabled={saving || uploading} className="mt-5 w-full">{saving ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}</Button>
          </AdminCard>

          {f.type === 'physical' && liveVariants.length === 0 && (
            <AdminCard title="Stock">
              {isNew ? (
                <AdminField id="pf-is" label="Opening stock" hint="How many you have now."><input id="pf-is" inputMode="numeric" value={f.initialStock} onChange={(e) => set('initialStock', e.target.value.replace(/\D/g, ''))} className={input} /></AdminField>
              ) : (
                <>
                  <p className="text-3xl font-extrabold tabular-nums text-ink">{f.stock ?? 0}<span className="ml-1 text-sm font-normal text-muted">in stock</span></p>
                  <button type="button" onClick={() => setAdjust({ variantId: null, qty: '', reason: 'restock', note: '' })} className="mt-3 text-sm font-semibold text-brand-deep">Adjust stock</button>
                </>
              )}
              <AdminField id="pf-low" label="Low-stock warning at" className="mt-4"><input id="pf-low" inputMode="numeric" value={f.low_stock_threshold} onChange={(e) => set('low_stock_threshold', e.target.value.replace(/\D/g, ''))} className={input} /></AdminField>
            </AdminCard>
          )}

          {adjust && (
            <AdminCard title="Adjust stock" className="border-ink">
              <div className="grid gap-3">
                <AdminField id="adj-reason" label="Reason">
                  <select id="adj-reason" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value as typeof adjust.reason })} className={input}>
                    <option value="restock">New stock arrived (+)</option><option value="return">Customer return (+)</option><option value="damaged">Damaged / lost (−)</option><option value="adjustment">Stock count correction (±)</option>
                  </select>
                </AdminField>
                <AdminField id="adj-qty" label="Quantity" hint={adjust.reason === 'adjustment' ? 'Use a minus sign to remove, e.g. -2' : undefined}><input id="adj-qty" inputMode="numeric" value={adjust.qty} onChange={(e) => setAdjust({ ...adjust, qty: e.target.value })} className={input} /></AdminField>
                <AdminField id="adj-note" label="Note"><input id="adj-note" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.target.value })} className={input} placeholder="e.g. Supplier invoice 1043" /></AdminField>
                <div className="flex gap-2"><Button type="button" onClick={() => void applyAdjust()}>Update stock</Button><Button type="button" variant="outline" onClick={() => setAdjust(null)}>Cancel</Button></div>
              </div>
            </AdminCard>
          )}

          <AdminCard title="Delivery note">
            <AdminField id="pf-dn" label="Shown on the product page" hint="Leave blank for the standard delivery message."><textarea id="pf-dn" rows={2} value={f.delivery_notes} onChange={(e) => set('delivery_notes', e.target.value)} className={input} /></AdminField>
          </AdminCard>

          {!isNew && (
            <AdminCard title="Delete product">
              {!confirmDelete ? (
                <>
                  <p className="text-sm text-muted">Products that have been ordered are archived instead, so order history stays intact.</p>
                  <Button type="button" variant="outline" onClick={() => setConfirmDelete(true)} className="mt-3 !border-[#F3B8B2] !text-[#B42318]"><Trash2 className="h-4 w-4" />Delete product</Button>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-ink">Delete “{f.name}” and its photos? This can’t be undone.</p>
                  <div className="mt-3 flex gap-2"><button type="button" onClick={() => void remove()} className="rounded-btn bg-[#B42318] px-4 py-2.5 text-sm font-semibold text-white">Yes, delete</button><Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>Keep it</Button></div>
                </>
              )}
            </AdminCard>
          )}
        </aside>
      </div>
    </form>
  );
}
