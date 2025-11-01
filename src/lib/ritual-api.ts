const API_BASE = 'https://poehali.dev/api';

export interface RitualFormat {
  id: number;
  name: string;
  description: string;
  duration_hours: number;
  base_price: number;
  is_active: boolean;
  sort_order: number;
}

export interface RitualOption {
  id: number;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export interface RitualLocation {
  id: number;
  name: string;
  price_per_hour: number;
  is_active: boolean;
  sort_order: number;
}

export interface TimeSlot {
  id: number;
  time_label: string;
  is_active: boolean;
  sort_order: number;
}

export interface RitualConfig {
  formats: RitualFormat[];
  options: RitualOption[];
  locations: RitualLocation[];
  timeSlots: TimeSlot[];
}

export interface RitualBooking {
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  ritualFormatId: number;
  locationId: number;
  selectedDate: string;
  timeSlotId: number;
  selectedOptions: number[];
  totalPrice: number;
  comment?: string;
}

export const ritualApi = {
  async getConfig(): Promise<RitualConfig> {
    const response = await fetch(`${API_BASE}/ritual-config`);
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  },

  async createBooking(booking: RitualBooking): Promise<{ bookingId: number; message: string }> {
    const response = await fetch(`${API_BASE}/ritual-booking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create booking');
    }
    return response.json();
  },

  async updateFormat(id: number, data: Partial<RitualFormat>, adminPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_formats', id, data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update format');
    }
  },

  async createFormat(data: Omit<RitualFormat, 'id' | 'is_active' | 'created_at' | 'updated_at'>, adminPassword: string): Promise<number> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_formats', data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create format');
    }
    const result = await response.json();
    return result.id;
  },

  async deleteFormat(id: number, adminPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_formats', id }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete format');
    }
  },

  async updateOption(id: number, data: Partial<RitualOption>, adminPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_options', id, data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update option');
    }
  },

  async updateLocation(id: number, data: Partial<RitualLocation>, adminPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_locations', id, data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update location');
    }
  },

  async updateTimeSlot(id: number, data: Partial<TimeSlot>, adminPassword: string): Promise<void> {
    const response = await fetch(`${API_BASE}/ritual-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': adminPassword,
      },
      body: JSON.stringify({ table: 'ritual_time_slots', id, data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update time slot');
    }
  },
};
