import dayjs from 'dayjs';

export function formatDateTime(value?: string | number | Date | null): string {
  if (!value) return '—';
  const d = dayjs(value);
  return d.isValid() ? d.format('DD.MM.YYYY HH:mm') : String(value);
}

export function shortId(id: string, length = 8) {
  return id ? id.slice(0, length) : '';
}
