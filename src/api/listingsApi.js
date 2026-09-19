import { supabase } from './supabaseClient';

export const listingsApi = {
  async filter(filters = {}, orderBy = '-created_date', limit = 50) {
    let query = supabase
      .from('listings')
      .select('*');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    if (orderBy) {
      const isDescending = orderBy.startsWith('-');
      const column = isDescending ? orderBy.substring(1) : orderBy;
      query = query.order(column, { ascending: !isDescending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[listingsApi.filter] error:', error, 'filters:', filters);
      return [];
    }

    return data || [];
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  /** Fetch a listing by its SEO slug.
   *  The slug embeds the full UUID (32 hex chars, no hyphens) at the end,
   *  so we can always resolve it via getById — no DB prefix search needed.
   *  Also handles legacy 8-char short-id slugs (pre-migration data). */
  async getBySlug(slug) {
    if (!slug) return null;

    // 1. Try exact DB slug match (fastest path for listings with slug saved)
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (data) return data;

    // 2. Extract full 32-char UUID from end of slug (current format)
    const fullMatch = slug.match(/([0-9a-f]{32})$/i);
    if (fullMatch) {
      const h = fullMatch[1];
      const uuid = `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
      return this.getById(uuid);
    }

    return null;
  },

  async create(listing) {
    const { data, error } = await supabase
      .from('listings')
      .insert([listing])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  },

  async incrementViews(id) {
    const { error } = await supabase.rpc('increment_listing_views', {
      listing_id: id
    });

    if (error) {
      console.error('Failed to increment views:', error);
    }
  },

  async getNearby(lat, lng, radiusKm = 25, limit = 20, category = null) {
    const params = {
      user_lat: lat,
      user_lng: lng,
      radius_km: radiusKm,
      lim: limit,
    };
    // Pass category into SQL so the LIMIT applies after filtering, preventing
    // client-side truncation from silently dropping nearby listings.
    if (category && category !== 'all_categories') {
      params.category_filter = category;
    }

    const { data, error } = await supabase.rpc('listings_within_radius', params);
    if (error) throw error;
    return data || [];
  },
};

export const savedListingsApi = {
  async filter(filters = {}) {
    let query = supabase
      .from('saved_listings')
      .select('*, listings(*)');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  },

  async create(savedListing) {
    const { data, error } = await supabase
      .from('saved_listings')
      .insert([savedListing])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return true;
  },

  async deleteByListingAndUser(listingId, userEmail) {
    const { error } = await supabase
      .from('saved_listings')
      .delete()
      .eq('listing_id', listingId)
      .eq('user_email', userEmail);

    if (error) {
      throw error;
    }

    return true;
  }
};

export const messagesApi = {
  async filter(filters = {}, orderBy = 'created_date', limit = 100) {
    let query = supabase
      .from('messages')
      .select('*');

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query = query.eq(key, value);
      }
    });

    if (orderBy) {
      const isDescending = orderBy.startsWith('-');
      const column = isDescending ? orderBy.substring(1) : orderBy;
      query = query.order(column, { ascending: !isDescending });
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  },

  async create(message) {
    const { data, error } = await supabase
      .from('messages')
      .insert([message])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('messages')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
