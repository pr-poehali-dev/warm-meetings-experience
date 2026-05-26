import { useQuery, useQueryClient } from '@tanstack/react-query';
import func2url from '../../backend/func2url.json';

export interface EventType {
  id: number;
  value: string;
  label: string;
  icon: string;
  sort_order: number;
}

const EVENTS_API_URL = func2url['events-api'];
const EVENT_TYPES_URL = `${EVENTS_API_URL}?resource=event_types`;

export const EVENT_TYPES_QUERY_KEY = ['event-types'] as const;

async function fetchEventTypes(): Promise<EventType[]> {
  const res = await fetch(EVENT_TYPES_URL);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Справочник типов событий. Кэшируется на 1 час (это словарь, меняется
 * только через админку), переживает навигацию между страницами.
 */
export function useEventTypes() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useQuery({
    queryKey: EVENT_TYPES_QUERY_KEY,
    queryFn: fetchEventTypes,
    staleTime: 60 * 60_000, // 1 час
    gcTime: 24 * 60 * 60_000, // 24 часа в памяти
  });

  return {
    types: data ?? [],
    loading: isLoading,
    reload: async () => {
      await queryClient.invalidateQueries({ queryKey: EVENT_TYPES_QUERY_KEY });
      await refetch();
    },
  };
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
  const res = await fetch(`${EVENTS_API_URL}?resource=event_types&id=${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: adminToken },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function deleteEventType(id: number, adminToken: string) {
  const res = await fetch(`${EVENTS_API_URL}?resource=event_types&id=${id}`, {
    method: 'DELETE',
    headers: { Authorization: adminToken },
  });
  return res.json();
}
