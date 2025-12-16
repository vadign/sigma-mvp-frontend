import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { EventResponse } from '../api/types';
import LevelTag from './LevelTag';

interface Props {
  events: EventResponse[];
  loading?: boolean;
  onRowClick?: (event: EventResponse) => void;
}

function resolveDescription(msg: Record<string, any>) {
  return msg.description || msg.title || msg.msg || JSON.stringify(msg).slice(0, 120);
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
