import { Table } from 'antd';
import dayjs from 'dayjs';
import { LogEntry } from '../../types/api';

interface Props {
  data?: LogEntry[];
  loading?: boolean;
  onSelect?: (log: LogEntry) => void;
}

export default function LogsTable({ data, loading, onSelect }: Props) {
  return (
    <Table
      rowKey="id"
      dataSource={data}
      loading={loading}
      pagination={false}
      onRow={(record) => ({
        onClick: () => onSelect?.(record),
      })}
      columns={[
        { title: 'ID', dataIndex: 'id', key: 'id' },
        {
          title: 'Timestamp',
          dataIndex: 'timestamp',
          key: 'timestamp',
          render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm:ss'),
        },
      ]}
    />
  );
}
