import { useState, useEffect } from 'react';
import func2url from '../../backend/func2url.json';

export interface EventType {
  id: number;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
}

const EVENT_TYPES_URL = func2url['event-types'];

export function useEventTypes() {
  const [types, setTypes] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await fetch(EVENT_TYPES_URL);
      const data = await res.json();
      setTypes(data);
    } catch {
      setTypes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return { types, loading, reload: load };
}

export async function createEventType(payload: { value: string; label: string; icon: string; sort_order?: number }, adminToken: string) {
  const res = await fetch(EVENT_TYPES_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: adminToken },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateEventType(id: number, payload: { label: string; icon: string; sort_order?: number }, adminToken: string) {
  const res = await fetch(`${EVENT_TYPES_URL}?id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: adminToken },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteEventType(id: number, adminToken: string) {
  const res = await fetch(`${EVENT_TYPES_URL}?id=${id}`, {
    method: 'DELETE',
    headers: { Authorization: adminToken },
  });
  return res.json();
}
