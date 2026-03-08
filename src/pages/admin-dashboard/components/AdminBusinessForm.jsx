import React, { useState, useEffect, useRef } from 'react';
import Icon from 'components/AppIcon';
import { adminBusinessService } from '../../../services/adminService';
import { businessService } from '../../../services/businessService';
import { supabase } from '../../../lib/supabase';
import OSMMap from 'components/maps/OSMMap';
import { geocode } from '../../../services/geocodingService';

const DAYS = [
  { key: 'monday', label: 'Lunes' },
  { key: 'tuesday', label: 'Martes' },
  { key: 'wednesday', label: 'Miércoles' },
  { key: 'thursday', label: 'Jueves' },
  { key: 'friday', label: 'Viernes' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const SOCIAL_TYPES = ['Facebook', 'Instagram', 'TikTok', 'YouTube', 'X (Twitter)', 'WhatsApp', 'Otra'];

const buildDefaultHours = () => ({
  monday:    { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  tuesday:   { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  wednesday: { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  thursday:  { closed: false, slots: [{ open: '09:00', close: '18:00' }] },
  friday:    { closed: false, slots: [{ open: '09:00', close: '17:00' }] },
  saturday:  { closed: false, slots: [{ open: '09:00', close: '13:00' }] },
  sunday:    { closed: true,  slots: [{ open: '09:00', close: '18:00' }] },
});

function parseHoursToState(opening_hours) {
  if (!opening_hours) return buildDefaultHours();
  // Handle new mode-based format
  if (opening_hours?.mode === 'variable' || opening_hours?.mode === 'always_open') return buildDefaultHours();
  // Handle mode=by_day
  const src = opening_hours?.mode === 'by_day' ? opening_hours?.days : opening_hours;
  if (!src) return buildDefaultHours();
  const h = {};
  DAYS?.forEach(d => {
    const day = src?.[d?.key];
    if (!day) { h[d.key] = { closed: false, slots: [{ open: '09:00', close: '18:00' }] }; return; }
    if (day?.closed || day?.open === false) { h[d.key] = { closed: true, slots: [{ open: '09:00', close: '18:00' }] }; return; }
    if (day?.allDay) { h[d.key] = { closed: false, slots: [{ open: '00:00', close: '23:59' }] }; return; }
    if (day?.open && day?.close && !day?.slots) {
      h[d.key] = { closed: false, slots: [{ open: day?.open, close: day?.close }] };
    } else {
      h[d.key] = { closed: false, slots: day?.slots?.length ? day?.slots : [{ open: '09:00', close: '18:00' }] };
    }
  });
  return h;
}

function detectHoursMode(opening_hours) {
  if (!opening_hours) return 'por_dia';
  if (opening_hours?.mode === 'variable') return 'variable';
  if (opening_hours?.mode === 'always_open') return 'always_open';
  return 'por_dia';
}

const EMPTY_FORM = {
  name: '',
  parent_category_id: '',
  parent_category_name: '',
  category_id: '',
  category: '',
  category_key: '',
  description: '',
  address: '',
  address_text: '',
  lat: null,
  lng: null,
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  verified: false,
  featured: false,
  status: 'published',
  logo_url: '',
  social_links: [],
  opening_hours: null,
};

export default function AdminBusinessForm({ editItem, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Category state
  const [categoryTree, setCategoryTree] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [catsLoading, setCatsLoading] = useState(true);

  // Logo
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoRef = useRef(null);

  // Gallery images
  const [existingImages, setExistingImages] = useState([]); // { id, storage_path, alt_text, is_primary, sort_order, publicUrl }
  const [newImageFiles, setNewImageFiles] = useState([]);   // File objects
  const [newImagePreviews, setNewImagePreviews] = useState([]); // { url, file }
  const [coverIndex, setCoverIndex] = useState(0); // index in combined list
  const [deletedImageIds, setDeletedImageIds] = useState([]);
  const galleryRef = useRef(null);

  // Hours
  const [hoursMode, setHoursMode] = useState('por_dia');
  const [perDayHours, setPerDayHours] = useState(buildDefaultHours());

  // Social links
  const [socialLinks, setSocialLinks] = useState([]);

  // Geocoding state
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState(null);

  // ── Add missing state variables for category/subcategory modals ──
  const [showNewCatModal, setShowNewCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatError, setNewCatError] = useState(null);
  const [newCatSaving, setNewCatSaving] = useState(false);

  const [showNewSubModal, setShowNewSubModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubSlug, setNewSubSlug] = useState('');
  const [newSubError, setNewSubError] = useState(null);
  const [newSubSaving, setNewSubSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (editItem) {
      // Detect parent/sub category
      const catId = editItem?.category_id || '';
      setForm({
        name: editItem?.name || '',
        parent_category_id: '',
        parent_category_name: editItem?.category || '',
        category_id: catId,
        category: editItem?.category || '',
        category_key: editItem?.category_key || '',
        description: editItem?.description || '',
        address: editItem?.address || '',
        address_text: editItem?.address_text || editItem?.address || '',
        lat: editItem?.lat ?? null,
        lng: editItem?.lng ?? null,
        phone: editItem?.phone || '',
        whatsapp: editItem?.whatsapp || '',
        email: editItem?.email || '',
        website: editItem?.website || '',
        verified: editItem?.verified || false,
        featured: editItem?.featured || false,
        status: editItem?.status || 'published',
        logo_url: editItem?.logo_url || '',
        social_links: Array.isArray(editItem?.social_links) ? editItem?.social_links : [],
        opening_hours: editItem?.opening_hours || null,
      });
      setLogoPreview(editItem?.logo_url || null);
      setLogoFile(null);
      setSocialLinks(Array.isArray(editItem?.social_links) ? editItem?.social_links : []);
      setHoursMode(detectHoursMode(editItem?.opening_hours));
      setPerDayHours(parseHoursToState(editItem?.opening_hours));
      // Load existing images
      const imgs = (editItem?.business_images || [])?.map(img => ({
        ...img,
        publicUrl: businessService?.getImageUrl(img?.storage_path),
      }))?.sort((a, b) => (a?.sort_order || 0) - (b?.sort_order || 0));
      setExistingImages(imgs);
      const primaryIdx = imgs?.findIndex(img => img?.is_primary);
      setCoverIndex(primaryIdx >= 0 ? primaryIdx : 0);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setDeletedImageIds([]);
    } else {
      setForm(EMPTY_FORM);
      setLogoPreview(null);
      setLogoFile(null);
      setSocialLinks([]);
      setHoursMode('por_dia');
      setPerDayHours(buildDefaultHours());
      setExistingImages([]);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      setDeletedImageIds([]);
      setCoverIndex(0);
    }
  }, [editItem]);

  // Once categories load, resolve parent/sub for edit
  useEffect(() => {
    if (!editItem || !categoryTree?.length) return;
    const catId = editItem?.category_id || '';
    if (!catId) return;
    // Find if it's a parent or sub
    const parent = categoryTree?.find(p => p?.id === catId);
    if (parent) {
      setForm(prev => ({ ...prev, parent_category_id: parent?.id, parent_category_name: parent?.name }));
      setSubcategories(parent?.subcategories || []);
    } else {
      // It's a subcategory
      for (const p of categoryTree) {
        const sub = p?.subcategories?.find(s => s?.id === catId);
        if (sub) {
          setForm(prev => ({
            ...prev,
            parent_category_id: p?.id,
            parent_category_name: p?.name,
            category_id: sub?.id,
            category: sub?.name,
            category_key: sub?.name_key || '',
          }));
          setSubcategories(p?.subcategories || []);
          break;
        }
      }
    }
  }, [categoryTree, editItem]);

  const loadCategories = async () => {
    setCatsLoading(true);
    const { data } = await businessService?.getHierarchicalCategories();
    setCategoryTree(data || []);
    setCatsLoading(false);
  };

  // ── Slug helper ────────────────────────────────────────────────────────────
  const toSlug = (str) =>
    str?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '')?.replace(/[^a-z0-9\s-]/g, '')?.trim()?.replace(/\s+/g, '-');

  // ── Quick-create category handlers ────────────────────────────────────────
  const openNewCatModal = () => {
    setNewCatName('');
    setNewCatSlug('');
    setNewCatError(null);
    setShowNewCatModal(true);
  };

  const handleNewCatNameChange = (val) => {
    setNewCatName(val);
    setNewCatSlug(toSlug(val));
  };

  const handleSaveNewCategory = async () => {
    if (!newCatName?.trim()) { setNewCatError('El nombre es obligatorio.'); return; }
    setNewCatSaving(true);
    setNewCatError(null);
    try {
      const { data, error } = await supabase?.from('categories')?.insert({ name: newCatName?.trim(), name_key: newCatSlug?.trim() || toSlug(newCatName?.trim()), parent_id: null, is_active: true, sort_order: 0 })?.select()?.single();
      if (error) throw error;
      // Refresh tree
      const { data: tree } = await businessService?.getHierarchicalCategories();
      const newTree = tree || [];
      setCategoryTree(newTree);
      // Auto-select new category
      setSubcategories([]);
      setForm(prev => ({
        ...prev,
        parent_category_id: data?.id,
        parent_category_name: data?.name,
        category_id: '',
        category: data?.name,
        category_key: data?.name_key || '',
      }));
      if (errors?.parent_category_id) setErrors(prev => ({ ...prev, parent_category_id: null }));
      setShowNewCatModal(false);
    } catch (err) {
      setNewCatError(err?.message || 'Error al guardar la categoría.');
    } finally {
      setNewCatSaving(false);
    }
  };

  // ── Quick-create subcategory handlers ─────────────────────────────────────
  const openNewSubModal = () => {
    setNewSubName('');
    setNewSubSlug('');
    setNewSubError(null);
    setShowNewSubModal(true);
  };

  const handleNewSubNameChange = (val) => {
    setNewSubName(val);
    setNewSubSlug(toSlug(val));
  };

  const handleSaveNewSubcategory = async () => {
    if (!newSubName?.trim()) { setNewSubError('El nombre es obligatorio.'); return; }
    setNewSubSaving(true);
    setNewSubError(null);
    try {
      const { data, error } = await supabase?.from('categories')?.insert({ name: newSubName?.trim(), name_key: newSubSlug?.trim() || toSlug(newSubName?.trim()), parent_id: form?.parent_category_id, is_active: true, sort_order: 0 })?.select()?.single();
      if (error) throw error;
      // Refresh tree
      const { data: tree } = await businessService?.getHierarchicalCategories();
      const newTree = tree || [];
      setCategoryTree(newTree);
      // Update subcategories list for current parent
      const updatedParent = newTree?.find(p => p?.id === form?.parent_category_id);
      const updatedSubs = updatedParent?.subcategories || [];
      setSubcategories(updatedSubs);
      // Auto-select new subcategory
      setForm(prev => ({
        ...prev,
        category_id: data?.id,
        category: data?.name,
        category_key: data?.name_key || '',
      }));
      if (errors?.category_id) setErrors(prev => ({ ...prev, category_id: null }));
      setShowNewSubModal(false);
    } catch (err) {
      setNewSubError(err?.message || 'Error al guardar la subcategoría.');
    } finally {
      setNewSubSaving(false);
    }
  };

  // ── Category handlers ──────────────────────────────────────────────────────
  const handleParentCategoryChange = (e) => {
    const parentId = e?.target?.value;
    const parent = categoryTree?.find(c => c?.id === parentId);
    const subs = parent?.subcategories || [];
    setSubcategories(subs);
    setForm(prev => ({
      ...prev,
      parent_category_id: parentId,
      parent_category_name: parent?.name || '',
      category_id: '',
      category: parent?.name || '',
      category_key: parent?.name_key || '',
    }));
    if (errors?.parent_category_id) setErrors(prev => ({ ...prev, parent_category_id: null }));
  };

  const handleSubcategoryChange = (e) => {
    const subId = e?.target?.value;
    const sub = subcategories?.find(c => c?.id === subId);
    setForm(prev => ({
      ...prev,
      category_id: sub?.id || '',
      category: sub?.name || '',
      category_key: sub?.name_key || '',
    }));
    if (errors?.category_id) setErrors(prev => ({ ...prev, category_id: null }));
  };

  // ── Logo handlers ──────────────────────────────────────────────────────────
  const handleLogoChange = (e) => {
    const file = e?.target?.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp']?.includes(file?.type)) {
      setErrors(prev => ({ ...prev, logo: 'Solo JPG, PNG o WebP.' }));
      return;
    }
    if (file?.size > 2 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'El logo no puede superar 2MB.' }));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors(prev => ({ ...prev, logo: null }));
  };

  // ── Gallery handlers ───────────────────────────────────────────────────────
  const handleGalleryAdd = (e) => {
    const files = Array.from(e?.target?.files || []);
    const valid = files?.filter(f => ['image/jpeg', 'image/png', 'image/webp']?.includes(f?.type));
    const totalExisting = existingImages?.length + newImageFiles?.length;
    const canAdd = Math.max(0, 10 - totalExisting);
    const toAdd = valid?.slice(0, canAdd);
    const newFiles = [...newImageFiles, ...toAdd];
    const newPreviews = [...newImagePreviews, ...toAdd?.map(f => ({ url: URL.createObjectURL(f), file: f }))];
    setNewImageFiles(newFiles);
    setNewImagePreviews(newPreviews);
    e.target.value = '';
  };

  const removeExistingImage = (idx) => {
    const img = existingImages?.[idx];
    if (img?.id) setDeletedImageIds(prev => [...prev, img?.id]);
    const updated = existingImages?.filter((_, i) => i !== idx);
    setExistingImages(updated);
    // Adjust cover
    const totalAfter = updated?.length + newImagePreviews?.length;
    if (coverIndex >= totalAfter) setCoverIndex(Math.max(0, totalAfter - 1));
  };

  const removeNewImage = (idx) => {
    const updatedFiles = newImageFiles?.filter((_, i) => i !== idx);
    const updatedPreviews = newImagePreviews?.filter((_, i) => i !== idx);
    setNewImageFiles(updatedFiles);
    setNewImagePreviews(updatedPreviews);
    const totalAfter = existingImages?.length + updatedFiles?.length;
    if (coverIndex >= totalAfter) setCoverIndex(Math.max(0, totalAfter - 1));
  };

  // Move existing image left/right
  const moveExistingImage = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= existingImages?.length) return;
    const updated = [...existingImages];
    [updated[idx], updated[newIdx]] = [updated?.[newIdx], updated?.[idx]];
    setExistingImages(updated);
    if (coverIndex === idx) setCoverIndex(newIdx);
    else if (coverIndex === newIdx) setCoverIndex(idx);
  };

  // ── Hours helpers ──────────────────────────────────────────────────────────
  const updateSlot = (dayKey, slotIdx, field, value) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: {
        ...prev?.[dayKey],
        slots: prev?.[dayKey]?.slots?.map((s, i) => i === slotIdx ? { ...s, [field]: value } : s),
      },
    }));
  };

  const addSlot = (dayKey) => {
    setPerDayHours(prev => {
      const day = prev?.[dayKey];
      if (day?.slots?.length >= 2) return prev;
      return { ...prev, [dayKey]: { ...day, slots: [...day?.slots, { open: '14:00', close: '20:00' }] } };
    });
  };

  const removeSlot = (dayKey, slotIdx) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: { ...prev?.[dayKey], slots: prev?.[dayKey]?.slots?.filter((_, i) => i !== slotIdx) },
    }));
  };

  const toggleDayClosed = (dayKey) => {
    setPerDayHours(prev => ({
      ...prev,
      [dayKey]: { ...prev?.[dayKey], closed: !prev?.[dayKey]?.closed },
    }));
  };

  const copyToNextDay = (dayKey) => {
    const idx = DAYS?.findIndex(d => d?.key === dayKey);
    if (idx < 0 || idx >= DAYS?.length - 1) return;
    const nextKey = DAYS?.[idx + 1]?.key;
    const source = perDayHours?.[dayKey];
    setPerDayHours(prev => ({
      ...prev,
      [nextKey]: { ...source, slots: source?.slots?.map(s => ({ ...s })) },
    }));
  };

  const copyMondayToAll = () => {
    const source = perDayHours?.monday;
    setPerDayHours(prev => {
      const next = { ...prev };
      DAYS?.filter(d => d?.key !== 'monday')?.forEach(d => {
        next[d.key] = { ...source, slots: source?.slots?.map(s => ({ ...s })) };
      });
      return next;
    });
  };

  // ── Social links helpers ───────────────────────────────────────────────────
  const addSocialLink = () => setSocialLinks(prev => [...prev, { type: 'Instagram', url: '' }]);
  const updateSocialLink = (idx, field, value) =>
    setSocialLinks(prev => prev?.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  const removeSocialLink = (idx) =>
    setSocialLinks(prev => prev?.filter((_, i) => i !== idx));

  // ── Build opening_hours JSON ───────────────────────────────────────────────
  const buildOpeningHours = () => {
    if (hoursMode === 'variable') return { mode: 'variable' };
    if (hoursMode === 'always_open') return { mode: 'always_open' };
    const days = {};
    DAYS?.forEach(d => {
      const day = perDayHours?.[d?.key];
      if (day?.closed) {
        days[d.key] = { open: false, slots: [] };
      } else {
        days[d.key] = { open: true, slots: day?.slots };
      }
    });
    return { mode: 'by_day', days };
  };

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form?.name?.trim()) errs.name = 'El nombre del negocio es obligatorio.';
    if (!form?.parent_category_id) errs.parent_category_id = 'Debes seleccionar una categoría principal.';
    if (form?.parent_category_id && subcategories?.length > 0 && !form?.category_id) {
      errs.category_id = 'Debes seleccionar una subcategoría.';
    }
    if (!form?.phone?.trim()) errs.phone = 'El teléfono es obligatorio.';
    if (!form?.address?.trim()) errs.address = 'La dirección es obligatoria.';
    if (!form?.description?.trim()) errs.description = 'La descripción es obligatoria.';
    if (form?.website?.trim()) {
      try { new URL(form.website.trim()); } catch { errs.website = 'URL del sitio web no válida.'; }
    }
    socialLinks?.forEach((s, i) => {
      if (!s?.url?.trim()) { errs[`social_${i}`] = 'La URL es obligatoria.'; return; }
      if (s?.type === 'WhatsApp') {
        const waOk = /^(https?:\/\/(wa\.me|api\.whatsapp\.com)|\+\d{7,15})/?.test(s?.url?.trim());
        if (!waOk) errs[`social_${i}`] = 'Para WhatsApp usa https://wa.me/... o +56...';
      } else {
        try { new URL(s.url.trim()); } catch { errs[`social_${i}`] = 'URL no válida.'; }
      }
    });
    if (hoursMode === 'por_dia') {
      DAYS?.forEach(d => {
        const day = perDayHours?.[d?.key];
        if (!day?.closed) {
          day?.slots?.forEach((slot, i) => {
            if (slot?.close <= slot?.open) errs[`${d.key}_slot_${i}`] = `${d?.label}: cierre debe ser mayor que apertura.`;
          });
          if (day?.slots?.length === 2 && day?.slots?.[1]?.open < day?.slots?.[0]?.close) {
            errs[`${d.key}_overlap`] = `${d?.label}: los tramos se solapan.`;
          }
        }
      });
    }
    return errs;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e?.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors)?.length > 0) {
      setErrors(validationErrors);
      // Scroll to first error
      const firstErrEl = document.querySelector('[data-error="true"]');
      firstErrEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const finalCategoryId = form?.category_id || form?.parent_category_id;
      const payload = {
        name: form?.name?.trim(),
        category: form?.category,
        category_key: form?.category_key,
        category_id: finalCategoryId || null,
        description: form?.description?.trim(),
        address: form?.address?.trim(),
        address_text: form?.address_text?.trim() || form?.address?.trim() || null,
        lat: form?.lat ?? null,
        lng: form?.lng ?? null,
        phone: form?.phone?.trim(),
        whatsapp: form?.whatsapp?.trim() || null,
        email: form?.email?.trim() || null,
        website: form?.website?.trim() || null,
        verified: form?.verified,
        featured: form?.featured,
        status: form?.status,
        opening_hours: buildOpeningHours(),
        social_links: socialLinks?.filter(s => s?.url?.trim()),
        claimed: form?.owner_id ? true : false,
        owner_id: form?.owner_id ?? null,
      };

      let savedId = editItem?.id;
      if (editItem) {
        await adminBusinessService?.update(editItem?.id, payload);
      } else {
        const created = await adminBusinessService?.create(payload);
        savedId = created?.id;
      }

      if (!savedId) throw new Error('No se pudo obtener el ID del negocio.');

      // Upload logo
      if (logoFile) {
        const { publicUrl, error: uploadErr } = await businessService?.uploadLogo(logoFile, savedId);
        if (!uploadErr && publicUrl) {
          await adminBusinessService?.update(savedId, { logo_url: publicUrl });
        }
      }

      // Delete removed images
      for (const imgId of deletedImageIds) {
        await businessService?.deleteImage(imgId);
      }

      // Update sort_order and is_primary for existing images
      for (let i = 0; i < existingImages?.length; i++) {
        const img = existingImages?.[i];
        const isPrimary = coverIndex === i;
        await businessService?.updateImage?.(img?.id, { sort_order: i, is_primary: isPrimary });
      }

      // Upload new images
      const existingCount = existingImages?.length;
      for (let i = 0; i < newImageFiles?.length; i++) {
        const { path, error: uploadErr } = await businessService?.uploadImage(newImageFiles?.[i], savedId);
        if (!uploadErr && path) {
          const globalIdx = existingCount + i;
          const isPrimary = coverIndex === globalIdx;
          await businessService?.addImage({
            businessId: savedId,
            storagePath: path,
            altText: `Foto ${globalIdx + 1} de ${form?.name}`,
            isPrimary,
            sortOrder: globalIdx,
          });
        }
      }

      onSave?.();
    } catch (err) {
      setSaveError(err?.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleGeocode = async () => {
    const addressToGeocode = form?.address_text?.trim() || form?.address?.trim();
    if (!addressToGeocode) {
      setGeocodeError('Por favor ingresa una dirección para buscar.');
      return;
    }
    setGeocoding(true);
    setGeocodeError(null);
    try {
      const result = await geocode(addressToGeocode);
      if (result?.lat && result?.lng) {
        setForm(f => ({ ...f, lat: result.lat, lng: result.lng }));
        setGeocodeError(null);
      } else {
        setGeocodeError('No se pudo encontrar la ubicación. Intenta con otra dirección.');
      }
    } catch (err) {
      setGeocodeError(err?.message || 'Error al buscar la ubicación.');
    } finally {
      setGeocoding(false);
    }
  };

  const totalImages = existingImages?.length + newImagePreviews?.length;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border bg-card shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <Icon name="ArrowLeft" size={20} color="currentColor" />
          </button>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">
              {editItem ? 'Editar Negocio' : 'Nuevo Negocio'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {editItem ? `Editando: ${editItem?.name}` : 'Crear nuevo negocio en el directorio'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-white" /> Guardando...</>
            ) : (
              <><Icon name="Save" size={15} color="white" /> {editItem ? 'Guardar cambios' : 'Crear negocio'}</>
            )}
          </button>
        </div>
      </div>
      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {saveError && (
            <div className="p-3 rounded-lg text-sm border" style={{ background: '#fee2e2', color: 'var(--color-error)', borderColor: '#fca5a5' }}>
              {saveError}
            </div>
          )}

          {/* ── Información básica ─────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Building2" size={18} color="var(--color-primary)" />
              Información del negocio
            </h2>
            <div className="space-y-4">
              {/* Nombre */}
              <div data-error={!!errors?.name}>
                <label className="block text-sm font-medium text-foreground mb-1">Nombre del negocio <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  value={form?.name}
                  onChange={e => { setForm(f => ({ ...f, name: e?.target?.value })); if (errors?.name) setErrors(p => ({ ...p, name: null })); }}
                  placeholder="Ej: Pizzería Don Carlos"
                  className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.name ? 'border-red-400' : 'border-border'}`}
                />
                {errors?.name && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.name}</p>}
              </div>

              {/* Categoría 2-step */}
              <div data-error={!!errors?.parent_category_id || !!errors?.category_id}>
                <label className="block text-sm font-medium text-foreground mb-1">Categoría <span style={{ color: 'var(--color-error)' }}>*</span></label>
                {catsLoading ? (
                  <div className="flex items-center gap-2 py-2.5 px-3 border border-border rounded-md bg-muted">
                    <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
                    <span className="text-sm text-muted-foreground">Cargando categorías...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs text-muted-foreground">Paso 1: Categoría principal</label>
                        <button
                          type="button"
                          onClick={openNewCatModal}
                          className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                          style={{ color: 'var(--color-primary)' }}
                        >
                          <Icon name="Plus" size={12} />
                          Nueva categoría
                        </button>
                      </div>
                      <select
                        value={form?.parent_category_id}
                        onChange={handleParentCategoryChange}
                        className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.parent_category_id ? 'border-red-400' : 'border-border'}`}
                      >
                        <option value="">Selecciona una categoría...</option>
                        {categoryTree?.map(cat => (
                          <option key={cat?.id} value={cat?.id}>{cat?.name}</option>
                        ))}
                      </select>
                      {errors?.parent_category_id && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.parent_category_id}</p>}
                    </div>
                    {form?.parent_category_id && subcategories?.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-muted-foreground">Paso 2: Subcategoría</label>
                          <button
                            type="button"
                            onClick={openNewSubModal}
                            className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            <Icon name="Plus" size={12} />
                            Nueva subcategoría
                          </button>
                        </div>
                        <select
                          value={form?.category_id}
                          onChange={handleSubcategoryChange}
                          className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.category_id ? 'border-red-400' : 'border-border'}`}
                        >
                          <option value="">Selecciona una subcategoría...</option>
                          {subcategories?.map(sub => (
                            <option key={sub?.id} value={sub?.id}>{sub?.name}</option>
                          ))}
                        </select>
                        {errors?.category_id && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.category_id}</p>}
                      </div>
                    )}
                    {form?.parent_category_id && subcategories?.length === 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs text-muted-foreground">Paso 2: Subcategoría</label>
                          <button
                            type="button"
                            onClick={openNewSubModal}
                            className="text-xs font-medium flex items-center gap-0.5 hover:underline"
                            style={{ color: 'var(--color-primary)' }}
                          >
                            <Icon name="Plus" size={12} />
                            Nueva subcategoría
                          </button>
                        </div>
                      </div>
                    )}
                    {form?.parent_category_name && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs" style={{ background: 'var(--color-muted)' }}>
                        <Icon name="Tag" size={13} color="var(--color-primary)" />
                        <span className="text-muted-foreground">Seleccionada:</span>
                        <span className="font-medium text-foreground">{form?.parent_category_name}</span>
                        {form?.category && form?.category !== form?.parent_category_name && (
                          <><Icon name="ChevronRight" size={13} color="var(--color-muted-foreground)" /><span className="font-medium text-foreground">{form?.category}</span></>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Teléfono */}
              <div data-error={!!errors?.phone}>
                <label className="block text-sm font-medium text-foreground mb-1">Teléfono <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="tel"
                  value={form?.phone}
                  onChange={e => { setForm(f => ({ ...f, phone: e?.target?.value })); if (errors?.phone) setErrors(p => ({ ...p, phone: null })); }}
                  placeholder="Ej: +56 9 1234 5678"
                  className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.phone ? 'border-red-400' : 'border-border'}`}
                />
                {errors?.phone && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.phone}</p>}
              </div>

              {/* Dirección */}
              <div data-error={!!errors?.address}>
                <label className="block text-sm font-medium text-foreground mb-1">Dirección <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <input
                  type="text"
                  value={form?.address}
                  onChange={e => { setForm(f => ({ ...f, address: e?.target?.value })); if (errors?.address) setErrors(p => ({ ...p, address: null })); }}
                  placeholder="Ej: Av. Los Carrera 123, Coronel"
                  className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.address ? 'border-red-400' : 'border-border'}`}
                />
                {errors?.address && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.address}</p>}
              </div>

              {/* Ubicación en el mapa */}
              <div className="border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Icon name="MapPin" size={15} color="var(--color-primary)" />
                  Ubicación en el mapa
                </h3>
                {/* address_text + geocode button */}
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Dirección detallada</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form?.address_text}
                      onChange={e => { setForm(f => ({ ...f, address_text: e?.target?.value })); setGeocodeError(null); }}
                      placeholder="Ej: Las Encinas 80, Coronel"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={geocoding}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-md transition-colors disabled:opacity-60 shrink-0"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {geocoding ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="MapPin" size={14} color="white" />
                      )}
                      Buscar en el mapa
                    </button>
                  </div>
                  {geocodeError && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{geocodeError}</p>}
                </div>
                {/* Map picker */}
                <div className="rounded-lg overflow-hidden border border-border" style={{ height: '350px' }}>
                  <OSMMap
                    lat={form?.lat}
                    lng={form?.lng}
                    onChange={({ lat, lng }) => setForm(f => ({ ...f, lat, lng }))}
                    height="350px"
                    zoom={14}
                    readOnly={false}
                  />
                </div>
                {/* Coords display */}
                <p className="text-xs text-muted-foreground">
                  {form?.lat && form?.lng
                    ? `📍 ${parseFloat(form?.lat)?.toFixed(5)}, ${parseFloat(form?.lng)?.toFixed(5)}`
                    : 'Sin coordenadas guardadas'}
                </p>
              </div>

              {/* Descripción */}
              <div data-error={!!errors?.description}>
                <label className="block text-sm font-medium text-foreground mb-1">Descripción <span style={{ color: 'var(--color-error)' }}>*</span></label>
                <textarea
                  value={form?.description}
                  onChange={e => { setForm(f => ({ ...f, description: e?.target?.value })); if (errors?.description) setErrors(p => ({ ...p, description: null })); }}
                  rows={4}
                  placeholder="Describe el negocio, productos o servicios..."
                  className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none ${errors?.description ? 'border-red-400' : 'border-border'}`}
                />
                {errors?.description && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.description}</p>}
              </div>
            </div>
          </div>

          {/* ── Horarios ──────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Clock" size={18} color="var(--color-primary)" />
              Horarios de atención
            </h2>

            {/* Mode pills */}
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { key: 'por_dia', label: 'Por día' },
                { key: 'variable', label: 'Horario variable (consultar por WhatsApp)' },
                { key: 'always_open', label: 'Atención 24 horas' },
              ]?.map(m => (
                <button
                  key={m?.key}
                  type="button"
                  onClick={() => setHoursMode(m?.key)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    hoursMode === m?.key
                      ? 'border-primary bg-primary/10 text-primary font-medium' :'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {m?.label}
                </button>
              ))}
            </div>

            {/* Variable mode */}
            {hoursMode === 'variable' && (
              <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
                <Icon name="MessageCircle" size={18} color="#d97706" className="mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800">El horario será mostrado como variable. Se recomienda indicar un WhatsApp de contacto.</p>
              </div>
            )}

            {/* Always open mode */}
            {hoursMode === 'always_open' && (
              <div className="flex items-center gap-3 p-4 rounded-lg border border-green-200 bg-green-50">
                <Icon name="Clock" size={18} color="#16a34a" className="shrink-0" />
                <p className="text-sm font-medium text-green-800">El negocio aparecerá como Abierto 24/7.</p>
              </div>
            )}

            {/* Por día — weekly editor */}
            {hoursMode === 'por_dia' && (
              <div className="space-y-2">
                {DAYS?.map((d, dayIndex) => {
                  const day = perDayHours?.[d?.key];
                  const isLastDay = dayIndex === DAYS?.length - 1;
                  return (
                    <div key={d?.key} className="border border-border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-foreground w-20">{d?.label}</span>
                          <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={day?.closed}
                              onChange={() => toggleDayClosed(d?.key)}
                              className="rounded"
                            />
                            <span className={day?.closed ? 'text-red-500 font-medium' : 'text-muted-foreground'}>Cerrado</span>
                          </label>
                        </div>
                        {!isLastDay && (
                          <button
                            type="button"
                            title={`Copiar al día siguiente (${DAYS?.[dayIndex + 1]?.label})`}
                            onClick={() => copyToNextDay(d?.key)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                          >
                            <Icon name="ArrowRight" size={13} color="currentColor" />
                            <span>Copiar al siguiente</span>
                          </button>
                        )}
                      </div>
                      {!day?.closed && (
                        <div className="space-y-2">
                          {day?.slots?.map((slot, si) => (
                            <div key={si} className="flex items-center gap-2">
                              <input
                                type="time"
                                value={slot?.open}
                                onChange={e => updateSlot(d?.key, si, 'open', e?.target?.value)}
                                className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
                              />
                              <span className="text-muted-foreground text-xs">–</span>
                              <input
                                type="time"
                                value={slot?.close}
                                onChange={e => updateSlot(d?.key, si, 'close', e?.target?.value)}
                                className="flex-1 px-2 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none"
                              />
                              {si > 0 && (
                                <button type="button" onClick={() => removeSlot(d?.key, si)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                                  <Icon name="X" size={13} color="currentColor" />
                                </button>
                              )}
                            </div>
                          ))}
                          {errors?.[`${d?.key}_slot_0`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_slot_0`]}</p>}
                          {errors?.[`${d?.key}_slot_1`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_slot_1`]}</p>}
                          {errors?.[`${d?.key}_overlap`] && <p className="text-xs" style={{ color: 'var(--color-error)' }}>{errors?.[`${d?.key}_overlap`]}</p>}
                          {day?.slots?.length < 2 && (
                            <button
                              type="button"
                              onClick={() => addSlot(d?.key)}
                              className="flex items-center gap-1 text-xs mt-1 hover:underline"
                              style={{ color: 'var(--color-primary)' }}
                            >
                              <Icon name="Plus" size={12} color="currentColor" /> + Agregar tramo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={copyMondayToAll}
                    className="flex items-center gap-2 w-full justify-center px-4 py-2.5 text-sm rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Icon name="Copy" size={14} color="currentColor" />
                    Copiar horario del Lunes a todos los días
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Información adicional ──────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Plus" size={18} color="var(--color-primary)" />
              Información adicional
            </h2>
            <div className="space-y-4">
              {/* WhatsApp */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={form?.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e?.target?.value }))}
                  placeholder="Ej: +56 9 1234 5678"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={form?.email}
                  onChange={e => setForm(f => ({ ...f, email: e?.target?.value }))}
                  placeholder="contacto@negocio.cl"
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Sitio web */}
              <div data-error={!!errors?.website}>
                <label className="block text-sm font-medium text-foreground mb-1">Sitio web</label>
                <input
                  type="url"
                  value={form?.website}
                  onChange={e => { setForm(f => ({ ...f, website: e?.target?.value })); if (errors?.website) setErrors(p => ({ ...p, website: null })); }}
                  placeholder="https://minegocio.cl"
                  className={`w-full px-3 py-2.5 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.website ? 'border-red-400' : 'border-border'}`}
                />
                {errors?.website && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.website}</p>}
              </div>

              {/* Redes sociales */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Redes sociales</label>
                <div className="space-y-2">
                  {socialLinks?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <select
                        value={s?.type}
                        onChange={e => updateSocialLink(i, 'type', e?.target?.value)}
                        className="w-36 px-2 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none shrink-0"
                      >
                        {SOCIAL_TYPES?.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={s?.url}
                          onChange={e => updateSocialLink(i, 'url', e?.target?.value)}
                          placeholder={s?.type === 'WhatsApp' ? 'https://wa.me/56912345678 o +56...' : 'https://...'}
                          className={`w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${errors?.[`social_${i}`] ? 'border-red-400' : 'border-border'}`}
                        />
                        {errors?.[`social_${i}`] && <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>{errors?.[`social_${i}`]}</p>}
                      </div>
                      <button type="button" onClick={() => removeSocialLink(i)} className="p-2 rounded hover:bg-muted text-muted-foreground shrink-0 mt-0.5">
                        <Icon name="X" size={15} color="currentColor" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSocialLink}
                    className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border border-dashed border-border hover:border-primary hover:text-primary transition-colors text-muted-foreground"
                  >
                    <Icon name="Plus" size={14} color="currentColor" /> Agregar red social
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── Logo ──────────────────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Image" size={18} color="var(--color-primary)" />
              Logo del negocio
            </h2>
            <p className="text-xs text-muted-foreground mb-3">JPG, PNG o WebP · Máx. 2MB · Recomendado: 512×512px</p>
            <div
              onClick={() => logoRef?.current?.click()}
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors"
            >
              {logoPreview ? (
                <div className="relative inline-block">
                  <img src={logoPreview} alt="Logo preview" className="w-24 h-24 object-cover rounded-lg mx-auto" />
                  <button
                    type="button"
                    onClick={(e) => { e?.stopPropagation(); setLogoFile(null); setLogoPreview(null); setForm(f => ({ ...f, logo_url: '' })); }}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center"
                  >
                    <Icon name="X" size={12} color="white" />
                  </button>
                </div>
              ) : (
                <>
                  <Icon name="Image" size={28} color="var(--color-muted-foreground)" className="mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Haz clic para subir logo</p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WebP</p>
                </>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
            {errors?.logo && <p className="text-xs mt-1" style={{ color: 'var(--color-error)' }}>{errors?.logo}</p>}
          </div>

          {/* ── Galería de imágenes ────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-1 flex items-center gap-2">
              <Icon name="Images" size={18} color="var(--color-primary)" />
              Galería de imágenes
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Máx. 10 imágenes · Haz clic en la estrella para marcar la imagen de portada</p>

            <div className="flex flex-wrap gap-3 mb-3">
              {/* Existing images */}
              {existingImages?.map((img, idx) => (
                <div
                  key={img?.id || idx}
                  className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                    coverIndex === idx ? 'border-primary shadow-md' : 'border-border'
                  }`}
                  style={{ width: 100, height: 100 }}
                >
                  <img
                    src={img?.publicUrl}
                    alt={img?.alt_text || `Imagen ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Cover badge */}
                  {coverIndex === idx && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                      Portada
                    </div>
                  )}
                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                    <button
                      type="button"
                      title="Marcar como portada"
                      onClick={() => setCoverIndex(idx)}
                      className={`p-1.5 rounded-full transition-colors ${
                        coverIndex === idx ? 'bg-primary text-white' : 'bg-white/90 text-gray-700 hover:bg-primary hover:text-white'
                      }`}
                    >
                      <Icon name="Star" size={13} color="currentColor" />
                    </button>
                    <button
                      type="button"
                      title="Mover izquierda"
                      onClick={() => moveExistingImage(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30"
                    >
                      <Icon name="ChevronLeft" size={13} color="currentColor" />
                    </button>
                    <button
                      type="button"
                      title="Mover derecha"
                      onClick={() => moveExistingImage(idx, 1)}
                      disabled={idx === existingImages?.length - 1}
                      className="p-1.5 rounded-full bg-white/90 text-gray-700 hover:bg-white disabled:opacity-30"
                    >
                      <Icon name="ChevronRight" size={13} color="currentColor" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar"
                      onClick={() => removeExistingImage(idx)}
                      className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                    >
                      <Icon name="Trash2" size={13} color="currentColor" />
                    </button>
                  </div>
                </div>
              ))}

              {/* New images (not yet uploaded) */}
              {newImagePreviews?.map((preview, idx) => {
                const globalIdx = existingImages?.length + idx;
                return (
                  <div
                    key={`new-${idx}`}
                    className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                      coverIndex === globalIdx ? 'border-primary shadow-md' : 'border-border border-dashed'
                    }`}
                    style={{ width: 100, height: 100 }}
                  >
                    <img
                      src={preview?.url}
                      alt={`Nueva imagen ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* New badge */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ background: '#6b7280' }}>
                      Nueva
                    </div>
                    {coverIndex === globalIdx && (
                      <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-xs font-bold text-white" style={{ background: 'var(--color-primary)' }}>
                        Portada
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title="Marcar como portada"
                        onClick={() => setCoverIndex(globalIdx)}
                        className={`p-1.5 rounded-full transition-colors ${
                          coverIndex === globalIdx ? 'bg-primary text-white' : 'bg-white/90 text-gray-700 hover:bg-primary hover:text-white'
                        }`}
                      >
                        <Icon name="Star" size={13} color="currentColor" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar"
                        onClick={() => removeNewImage(idx)}
                        className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <Icon name="Trash2" size={13} color="currentColor" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add button */}
              {totalImages < 10 && (
                <button
                  type="button"
                  onClick={() => galleryRef?.current?.click()}
                  className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors text-muted-foreground hover:text-primary"
                  style={{ width: 100, height: 100 }}
                >
                  <Icon name="Plus" size={22} color="currentColor" />
                  <span className="text-xs mt-1">Agregar</span>
                  <span className="text-xs">{totalImages}/10</span>
                </button>
              )}
            </div>

            <input
              ref={galleryRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={handleGalleryAdd}
            />

            {totalImages > 0 && (
              <p className="text-xs text-muted-foreground">
                <Icon name="Info" size={12} color="currentColor" className="inline mr-1" />
                Pasa el cursor sobre una imagen para ver las opciones. La imagen con estrella es la portada principal.
              </p>
            )}
          </div>

          {/* ── Configuración admin ────────────────────────────────────────── */}
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
              <Icon name="Settings" size={18} color="var(--color-primary)" />
              Configuración del negocio
            </h2>
            <div className="space-y-4">
              {/* Estado */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Estado</label>
                <select
                  value={form?.status}
                  onChange={e => setForm(f => ({ ...f, status: e?.target?.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="pending">Pendiente</option>
                  <option value="published">Publicado</option>
                  <option value="premium">Premium</option>
                  <option value="rejected">Rechazado</option>
                </select>
              </div>

              {/* Verificado / Destacado */}
              <div className="flex gap-6">
                {[['verified', 'Verificado', 'BadgeCheck'], ['featured', 'Destacado', 'Star']]?.map(([field, label, icon]) => (
                  <label key={field} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form?.[field] || false}
                      onChange={e => setForm(f => ({ ...f, [field]: e?.target?.checked }))}
                      className="rounded"
                    />
                    <Icon name={icon} size={15} color="var(--color-primary)" />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom save button */}
          <div className="pb-8">
            {saveError && (
              <div className="mb-4 p-3 rounded-lg text-sm border" style={{ background: '#fee2e2', color: 'var(--color-error)', borderColor: '#fca5a5' }}>
                {saveError}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 rounded-xl text-white font-medium text-base transition-all disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                editItem ? 'Guardar cambios' : 'Crear negocio'
              )}
            </button>
          </div>

          {/* ── Mini modal: Nueva categoría ─────────────────────────────────── */}
          {showNewCatModal && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={(e) => { if (e?.target === e?.currentTarget) setShowNewCatModal(false); }}
            >
              <div className="w-full max-w-sm rounded-xl shadow-xl border border-border bg-background p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Nueva categoría</h3>
                  <button type="button" onClick={() => setShowNewCatModal(false)} className="text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Nombre <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="text"
                      value={newCatName}
                      onChange={e => handleNewCatNameChange(e?.target?.value)}
                      placeholder="Ej: Restaurantes"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
                    <input
                      type="text"
                      value={newCatSlug}
                      onChange={e => setNewCatSlug(e?.target?.value)}
                      placeholder="restaurantes"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {newCatError && (
                    <p className="text-xs" style={{ color: 'var(--color-error)' }}>{newCatError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewCatModal(false)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewCategory}
                      disabled={newCatSaving}
                      className="flex-1 px-3 py-2 text-sm rounded-md font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {newCatSaving ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                      ) : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Mini modal: Nueva subcategoría ──────────────────────────────── */}
          {showNewSubModal && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.5)' }}
              onClick={(e) => { if (e?.target === e?.currentTarget) setShowNewSubModal(false); }}
            >
              <div className="w-full max-w-sm rounded-xl shadow-xl border border-border bg-background p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Nueva subcategoría</h3>
                  <button type="button" onClick={() => setShowNewSubModal(false)} className="text-muted-foreground hover:text-foreground">
                    <Icon name="X" size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Categoría padre</label>
                    <div className="px-3 py-2 text-sm border border-border rounded-md bg-muted text-muted-foreground">
                      {form?.parent_category_name || '—'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Nombre <span style={{ color: 'var(--color-error)' }}>*</span></label>
                    <input
                      type="text"
                      value={newSubName}
                      onChange={e => handleNewSubNameChange(e?.target?.value)}
                      placeholder="Ej: Pizzerías"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-foreground mb-1">Slug</label>
                    <input
                      type="text"
                      value={newSubSlug}
                      onChange={e => setNewSubSlug(e?.target?.value)}
                      placeholder="pizzerias"
                      className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {newSubError && (
                    <p className="text-xs" style={{ color: 'var(--color-error)' }}>{newSubError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowNewSubModal(false)}
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-md text-foreground hover:bg-muted transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNewSubcategory}
                      disabled={newSubSaving}
                      className="flex-1 px-3 py-2 text-sm rounded-md font-medium text-white transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      {newSubSaving ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                      ) : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
