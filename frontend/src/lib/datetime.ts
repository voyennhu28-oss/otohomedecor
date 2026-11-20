import { format } from 'date-fns';

export const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function toLocalInput(iso: string | null | undefined) {
  return iso ? format(new Date(iso), "yyyy-MM-dd'T'HH:mm") : '';
}

export function localInputToISO(local: string) {
  return new Date(local).toISOString();
}
