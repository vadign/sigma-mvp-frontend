import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { EventResponse } from '../api/types';
import { formatEdgeShortLabel } from '../utils/topologyLabels';
import LevelTag from './LevelTag';

interface Props {
  events: EventResponse[];
  loading?: boolean;
  onRowClick?: (event: EventResponse) => void;
}

const DESCRIPTION_KEYS = ['description', 'title', 'estimation', 'parameters', 'text', 'details'] as const;

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const tryParseJsonRecord = (value: unknown): Record<string, any> | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, any>;
    }
    return null;
  } catch {
    return null;
  }
};

function resolveDescription(msg: Record<string, any>) {
  const source = msg ?? {};
  const embedded = tryParseJsonRecord(source.msg);
  const payload = embedded ? { ...embedded, ...source } : source;
  const parts: string[] = [];
  const seen = new Set<string>();

  const pushPart = (value: unknown) => {
    if (typeof value !== 'string') return;
    const text = normalizeText(value);
    if (!text) return;

    const parsed = tryParseJsonRecord(text);
    if (parsed) {
      DESCRIPTION_KEYS.forEach((key) => pushPart(parsed[key]));
      return;
    }

    if (text.startsWith('{') && text.includes(':')) return;

    const dedupeKey = text.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    parts.push(text);
  };

  if (typeof payload.edge_id === 'number') {
    const edgeLabel = formatEdgeShortLabel(payload.edge_id);
    parts.push(edgeLabel);
    seen.add(edgeLabel.toLowerCase());
  }

  DESCRIPTION_KEYS.forEach((key) => pushPart(payload[key]));
  pushPart(payload.msg);

  if (parts.length === 0) return 'Описание события недоступно';
  return parts.join(' · ');
}

function EventsTable({ events, loading, onRowClick }: Props) {
  const columns: ColumnsType<EventResponse> = [
    {
      title: 'Время',
      dataIndex: 'created_at',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Описание',
      dataIndex: ['msg'],
      render: (msg: Record<string, any>) => resolveDescription(msg),
    },
    {
      title: 'Критичность',
      dataIndex: ['msg', 'level'],
      render: (_: unknown, record) => <LevelTag level={record.msg?.level} />,
    },
  ];

  return (
    <Table
      rowKey="id"
      dataSource={events}
      columns={columns}
      loading={loading}
      onRow={(record) => ({
        onClick: () => onRowClick?.(record),
        style: { cursor: onRowClick ? 'pointer' : 'default' },
      })}
      pagination={false}
    />
  );
}

export default EventsTable;
