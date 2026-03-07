import { supabase } from '../lib/supabase';

const CATEGORIES = ['Tecnología', 'Salud', 'Comercio', 'Construcción', 'Educación', 'Gastronomía', 'Administración', 'Otro'];
const MODALITIES = ['Presencial', 'Remoto', 'Híbrido'];
const TYPES = ['Full-time', 'Part-time', 'Por proyecto'];

function generateSlug(title) {
  const base = title?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '')?.replace(/[^a-z0-9\s-]/g, '')?.trim()?.replace(/\s+/g, '-')?.replace(/-+/g, '-');
  const suffix = Math.random()?.toString(36)?.substring(2, 7);
  return `${base}-${suffix}`;
}

export const jobService = {
  CATEGORIES,
  MODALITIES,
  TYPES,

  async checkExpiry() {
    try {
      await supabase?.rpc('check_job_expiry');
    } catch (e) {
      console.warn('checkExpiry error:', e);
    }
  },

  async getPublished({ search, category, modality, type, page = 1, pageSize = 12 } = {}) {
    try {
      await jobService?.checkExpiry();
      let query = supabase
        ?.from('jobs')
        ?.select('*', { count: 'exact' })
        ?.eq('status', 'published');

      if (search?.trim()) {
        query = query?.or(`title.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`);
      }
      if (category && category !== 'all') {
        query = query?.eq('category', category);
      }
      if (modality && modality !== 'all') {
        query = query?.eq('modality', modality);
      }
      if (type && type !== 'all') {
        query = query?.eq('type', type);
      }

      query = query?.order('created_at', { ascending: false });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query?.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      console.error('jobService.getPublished error:', error);
      return { data: [], count: 0, error };
    }
  },

  async getLatest(limit = 4) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.select('*')
        ?.eq('status', 'published')
        ?.order('created_at', { ascending: false })
        ?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async getBySlug(slug) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.select('*, businesses(id, name, address, phone, whatsapp, rating, slug)')
        ?.eq('slug', slug)
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getRelated(category, excludeId, limit = 3) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.select('*')
        ?.eq('status', 'published')
        ?.eq('category', category)
        ?.neq('id', excludeId)
        ?.order('created_at', { ascending: false })
        ?.limit(limit);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async create(formData, userId) {
    try {
      const slug = generateSlug(formData?.titulo || formData?.title || '');
      const payload = {
        title: formData?.titulo,
        slug,
        company: formData?.empresa,
        description: formData?.descripcion,
        requirements: formData?.requisitos || null,
        category: formData?.categoria || 'Otro',
        modality: formData?.modalidad || 'Presencial',
        type: formData?.tipo || 'Full-time',
        location: formData?.ubicacion,
        salary_min: formData?.salario_min ? parseInt(formData?.salario_min) : null,
        salary_max: formData?.salario_max ? parseInt(formData?.salario_max) : null,
        email_contact: formData?.email_contacto,
        whatsapp_contact: formData?.whatsapp_contacto || null,
        logo_url: formData?.logo_url || null,
        business_id: formData?.business_id || null,
        user_id: userId,
        status: 'pending',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)?.toISOString(),
      };
      const { data, error } = await supabase?.from('jobs')?.insert(payload)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('jobService.create error:', error);
      return { data: null, error };
    }
  },

  async uploadLogo(file, userId) {
    try {
      const ext = file?.name?.split('.')?.pop();
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase?.storage?.from('job-images')?.upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase?.storage?.from('job-images')?.getPublicUrl(path);
      return { url: urlData?.publicUrl, error: null };
    } catch (error) {
      return { url: null, error };
    }
  },

  async submitApplication(applicationData) {
    try {
      const payload = {
        job_id: applicationData?.job_id,
        nombre_completo: applicationData?.nombre_completo,
        email: applicationData?.email,
        telefono: applicationData?.telefono || null,
        cv_url: applicationData?.cv_url || null,
        carta_presentacion: applicationData?.carta_presentacion || null,
        status: 'pending',
      };
      const { data, error } = await supabase?.from('job_applications')?.insert(payload)?.select()?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('jobService.submitApplication error:', error);
      return { data: null, error };
    }
  },

  // Admin functions
  async adminGetAll({ search, status, category } = {}) {
    try {
      let query = supabase?.from('jobs')?.select('*, job_applications(count), businesses(id, name)', { count: 'exact' });
      if (search?.trim()) {
        query = query?.or(`title.ilike.%${search}%,company.ilike.%${search}%`);
      }
      if (status && status !== 'all') {
        query = query?.eq('status', status);
      }
      if (category && category !== 'all') {
        query = query?.eq('category', category);
      }
      query = query?.order('created_at', { ascending: false });
      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data || [], count: count || 0, error: null };
    } catch (error) {
      return { data: [], count: 0, error };
    }
  },

  async adminUpdateStatus(id, status) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.update({ status })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async adminDelete(id) {
    try {
      const { error } = await supabase?.from('jobs')?.delete()?.eq('id', id);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  },

  async getApplicationsByJob(jobId) {
    try {
      const { data, error } = await supabase
        ?.from('job_applications')
        ?.select('*')
        ?.eq('job_id', jobId)
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async updateApplicationStatus(id, status) {
    try {
      const { data, error } = await supabase
        ?.from('job_applications')
        ?.update({ status })
        ?.eq('id', id)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getByBusiness(businessId) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.select('*')
        ?.eq('business_id', businessId)
        ?.eq('status', 'published')
        ?.order('created_at', { ascending: false });
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async adminLinkBusiness(jobId, businessId) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.update({ business_id: businessId })
        ?.eq('id', jobId)
        ?.select('*, businesses(id, name)')
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async adminUnlinkBusiness(jobId) {
    try {
      const { data, error } = await supabase
        ?.from('jobs')
        ?.update({ business_id: null })
        ?.eq('id', jobId)
        ?.select()
        ?.single();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async searchBusinessesForLink(query) {
    try {
      const { data, error } = await supabase
        ?.from('businesses')
        ?.select('id, name, address, category')
        ?.ilike('name', `%${query}%`)
        ?.in('status', ['published', 'premium'])
        ?.order('name')
        ?.limit(10);
      if (error) throw error;
      return { data: data || [], error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  formatSalary(min, max) {
    if (!min && !max) return null;
    const fmt = (n) => n ? `$${Number(n)?.toLocaleString('es-CL')}` : null;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `Desde ${fmt(min)}`;
    return `Hasta ${fmt(max)}`;
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
  },
};
