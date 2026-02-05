import { Card, Empty, Select, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  DevRequest,
  DevRequestDomain,
  DevRequestPriority,
  DevRequestStatus,
  updateRequest,
  useDevRequests,
} from '../features/devRequests/store';

const domainLabels: Record<DevRequestDomain, string> = {
  heat: 'Теплосети',
  air: 'Качество воздуха',
  noise: 'Шум',
  other: 'Другое',
};

const priorityLabels: Record<DevRequestPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const statusLabels: Record<DevRequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  needs_info: 'Нужно уточнение',
  done: 'Готово',
};

const priorityColors: Record<DevRequestPriority, string> = {
  low: 'default',
  medium: 'gold',
  high: 'red',
};

function DevCabinetPage() {
  const requests = useDevRequests();

  const sortedRequests = [...requests].sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());

  const columns: ColumnsType<DevRequest> = [
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      width: 170,
    },
    {
      title: 'Направление',
      dataIndex: 'domain',
      render: (value: DevRequestDomain) => domainLabels[value],
      width: 170,
    },
    {
      title: 'Название помощника',
      dataIndex: 'assistantName',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      width: 260,
    },
    {
      title: 'Зона ответственности',
      dataIndex: 'responsibilityZone',
      width: 230,
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      render: (value: DevRequestPriority) => <Tag color={priorityColors[value]}>{priorityLabels[value]}</Tag>,
      width: 130,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 190,
      render: (value: DevRequestStatus, record) => (
        <Select
          value={value}
          style={{ width: 170 }}
          options={[
            { value: 'new', label: statusLabels.new },
            { value: 'in_progress', label: statusLabels.in_progress },
            { value: 'needs_info', label: statusLabels.needs_info },
            { value: 'done', label: statusLabels.done },
          ]}
          onChange={(nextStatus: DevRequestStatus) => updateRequest(record.id, { status: nextStatus })}
        />
      ),
    },
    {
      title: 'Инициатор',
      dataIndex: 'createdBy',
      width: 150,
    },
    {
      title: 'Контакт',
      dataIndex: 'contact',
      render: (value?: string) => value ?? '—',
      width: 180,
    },
  ];

  return (
    <div className="page-shell">
      <div>
        <Typography.Title level={3} className="page-title">
          Кабинет разработчика
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Заявки на запуск цифровых помощников
        </Typography.Paragraph>
      </div>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Table
            rowKey="id"
            dataSource={sortedRequests}
            columns={columns}
            pagination={false}
            locale={{
              emptyText: <Empty description="Пока нет заявок" image={Empty.PRESENTED_IMAGE_SIMPLE} />,
            }}
            scroll={{ x: 1480 }}
            expandable={{
              expandedRowRender: (record) => (
                <Typography.Paragraph style={{ marginBottom: 0 }}>{record.description}</Typography.Paragraph>
              ),
              rowExpandable: (record) => Boolean(record.description),
            }}
          />
        </Space>
      </Card>
    </div>
  );
}

export default DevCabinetPage;
