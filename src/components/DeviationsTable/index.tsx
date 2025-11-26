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
        { title: 'Edge ID', dataIndex: 'edge_id', key: 'edge_id' },
        { title: 'Type', dataIndex: 'type', key: 'type' },
        { title: 'Value', dataIndex: 'value', key: 'value' },
        { title: 'Reference', dataIndex: 'reference', key: 'reference' },
        {
          title: 'Level',
          dataIndex: 'level',
          key: 'level',
          render: (level: Deviation['level']) => {
            if (!level) return null;
            const color = level === 3 ? 'red' : level === 2 ? 'orange' : 'green';
            return <Tag color={color}>{level}</Tag>;
          },
        },
        { title: 'Regulation', dataIndex: 'regulation', key: 'regulation' },
        { title: 'Recommendation', dataIndex: 'recommendation', key: 'recommendation' },
      ]}
    />
  );
}
