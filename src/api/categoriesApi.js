import { supabase } from './supabaseClient';

export const categoriesApi = {
  async getAllCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getParentCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getSubcategoriesByParent(parentSlug) {
    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', parentSlug)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parent) return [];

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parent.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data;
  },

  async getCategoryBySlug(slug) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getCategoryFields(categorySlug) {
    const { data: category, error: catError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', categorySlug)
      .maybeSingle();

    if (catError) throw catError;
    if (!category) return [];

    const { data, error } = await supabase
      .from('category_fields')
      .select('*')
      .eq('category_id', category.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(f => ({
      ...f,
      options: typeof f.options === 'string'
        ? (() => { try { return JSON.parse(f.options); } catch { return []; } })()
        : (Array.isArray(f.options) ? f.options : []),
    }));
  },

  async getCategoryFieldsByParentSlug(parentSlug) {
    const { data: parent, error: parentError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', parentSlug)
      .is('parent_id', null)
      .maybeSingle();

    if (parentError) throw parentError;
    if (!parent) return [];

    const { data, error } = await supabase
      .from('category_fields')
      .select('*')
      .eq('category_id', parent.id)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    // Ensure `options` is always a parsed array (Supabase may return it as a JSON string)
    return (data || []).map(f => ({
      ...f,
      options: typeof f.options === 'string'
        ? (() => { try { return JSON.parse(f.options); } catch { return []; } })()
        : (Array.isArray(f.options) ? f.options : []),
    }));
  },

  async saveListingCustomFields(listingId, customFields) {
    const slugs = Object.keys(customFields);
    if (slugs.length === 0) return { success: true };

    const { data: fieldRows, error: fieldError } = await supabase
      .from('category_fields')
      .select('id, slug')
      .in('slug', slugs);

    if (fieldError) throw fieldError;

    const slugToId = {};
    (fieldRows || []).forEach(f => { slugToId[f.slug] = f.id; });

    const records = slugs
      .filter(slug => slugToId[slug])
      .map(slug => ({
        listing_id: listingId,
        category_field_id: slugToId[slug],
        value: typeof customFields[slug] === 'object' ? JSON.stringify(customFields[slug]) : String(customFields[slug] || ''),
      }));

    if (records.length === 0) return { success: true };

    const { error } = await supabase
      .from('listing_attributes')
      .insert(records);

    if (error) throw error;
    return { success: true };
  },

  async getListingCustomFields(listingId) {
    const { data, error } = await supabase
      .from('listing_attributes')
      .select('value, category_field_id, category_fields(slug, label, field_type)')
      .eq('listing_id', listingId);

    if (error) throw error;

    const fields = {};
    data?.forEach(item => {
      const fieldInfo = item.category_fields;
      if (fieldInfo) {
        fields[fieldInfo.slug] = {
          label: fieldInfo.label,
          value: item.value,
          type: fieldInfo.field_type
        };
      }
    });

    return fields;
  },

  async updateListingCustomFields(listingId, customFields) {
    await supabase.from('listing_attributes').delete().eq('listing_id', listingId);
    if (Object.keys(customFields).length > 0) {
      return this.saveListingCustomFields(listingId, customFields);
    }
    return { success: true };
  },

  async getCategoriesWithSubcategories() {
    const { data: allCategories, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const parents = allCategories.filter(cat => !cat.parent_id);
    const categoriesMap = {};

    parents.forEach(parent => {
      categoriesMap[parent.slug] = {
        ...parent,
        subcategories: allCategories
          .filter(cat => cat.parent_id === parent.id)
          .sort((a, b) => a.sort_order - b.sort_order)
      };
    });

    return categoriesMap;
  }
};
