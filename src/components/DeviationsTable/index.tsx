import { Table, Tag } from 'antd';
import { Deviation } from '../../types/api';

interface Props {
  data?: Deviation[];
  loading?: boolean;
}

export default function DeviationsTable({ data, loading }: Props) {
  return (
    <Table
      rowKey="id"
      dataSource={data}
      loading={loading}
      pagination={false}
      columns={[
        { title: 'Ребро', dataIndex: 'edge_id', key: 'edge_id' },
        { title: 'Параметр', dataIndex: 'type', key: 'type' },
        { title: 'Значение', dataIndex: 'value', key: 'value' },
        { title: 'Эталон', dataIndex: 'reference', key: 'reference' },
        {
          title: 'Уровень',
          dataIndex: 'level',
          key: 'level',
          render: (level: Deviation['level']) => {
            if (!level) return null;
            const color = level === 3 ? 'red' : level === 2 ? 'orange' : 'green';
            return <Tag color={color}>{level}</Tag>;
          },
        },
        { title: 'Регламент', dataIndex: 'regulation', key: 'regulation' },
        { title: 'Рекомендация', dataIndex: 'recommendation', key: 'recommendation' },
      ]}
    />
  );
}
