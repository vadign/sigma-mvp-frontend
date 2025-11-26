import { Button, Select, Space, Table } from 'antd';
import { Subscription, DeviationLevel } from '../../types/api';

interface Props {
  data?: Subscription[];
  onUpdateLevel: (subscriptionId: number, level: DeviationLevel) => void;
  onDelete: (subscriptionId: number) => void;
}

export default function SubscriptionsTable({ data, onUpdateLevel, onDelete }: Props) {
  return (
    <Table
      rowKey="id"
      dataSource={data}
      pagination={false}
      columns={[
        { title: 'ID', dataIndex: 'id', key: 'id' },
        { title: 'Сеть', dataIndex: 'network_id', key: 'network_id' },
        { title: 'Уровень', dataIndex: 'level', key: 'level' },
        {
          title: 'Действия',
          key: 'actions',
          render: (_: unknown, record: Subscription) => (
            <Space>
              <Select
                size="small"
                defaultValue={record.level}
                options={[1, 2, 3].map((lvl) => ({ label: lvl, value: lvl }))}
                onChange={(value) => onUpdateLevel(record.id, value as DeviationLevel)}
              />
              <Button danger type="link" onClick={() => onDelete(record.id)}>
                Удалить
              </Button>
            </Space>
          ),
        },
      ]}
    />
  );
}
