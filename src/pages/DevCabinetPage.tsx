import { useState } from 'react';
import { Button, Card, Descriptions, Empty, Modal, Select, Space, Table, Tag, Typography } from 'antd';
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

const statusColors: Record<DevRequestStatus, string> = {
  new: 'blue',
  in_progress: 'gold',
  needs_info: 'orange',
  done: 'green',
};

const statusOptions: Array<{ value: DevRequestStatus; label: string }> = [
  { value: 'new', label: statusLabels.new },
  { value: 'in_progress', label: statusLabels.in_progress },
  { value: 'needs_info', label: statusLabels.needs_info },
  { value: 'done', label: statusLabels.done },
];

function DevCabinetPage() {
  const requests = useDevRequests();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  const sortedRequests = [...requests].sort((a, b) => dayjs(b.createdAt).valueOf() - dayjs(a.createdAt).valueOf());
  const selectedRequest = sortedRequests.find((request) => request.id === selectedRequestId) ?? null;

  const columns: ColumnsType<DevRequest> = [
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      width: 170,
    },
    {
      title: 'Название помощника',
      dataIndex: 'assistantName',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
      width: 420,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 180,
      render: (value: DevRequestStatus) => <Tag color={statusColors[value]}>{statusLabels[value]}</Tag>,
    },
    {
      title: '',
      key: 'details',
      width: 130,
      render: (_: unknown, record) => (
        <Button type="link" onClick={() => setSelectedRequestId(record.id)}>
          Подробнее
        </Button>
      ),
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
            scroll={{ x: 900 }}
          />
        </Space>
      </Card>

      <Modal
        open={Boolean(selectedRequest)}
        title={selectedRequest ? `Заявка: ${selectedRequest.assistantName}` : 'Заявка'}
        onCancel={() => setSelectedRequestId(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedRequestId(null)}>
            Закрыть
          </Button>,
        ]}
      >
        {selectedRequest ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Descriptions
              size="small"
              column={1}
              items={[
                {
                  key: 'createdAt',
                  label: 'Дата создания',
                  children: dayjs(selectedRequest.createdAt).format('DD.MM.YYYY HH:mm'),
                },
                {
                  key: 'domain',
                  label: 'Направление',
                  children: domainLabels[selectedRequest.domain],
                },
                {
                  key: 'responsibilityZone',
                  label: 'Зона ответственности',
                  children: selectedRequest.responsibilityZone,
                },
                {
                  key: 'priority',
                  label: 'Приоритет',
                  children: <Tag color={priorityColors[selectedRequest.priority]}>{priorityLabels[selectedRequest.priority]}</Tag>,
                },
                {
                  key: 'createdBy',
                  label: 'Инициатор',
                  children: selectedRequest.createdBy,
                },
                {
                  key: 'contact',
                  label: 'Контакт',
                  children: selectedRequest.contact ?? '—',
                },
              ]}
            />

            <div>
              <Typography.Text strong>Описание</Typography.Text>
              <Typography.Paragraph style={{ marginBottom: 0, marginTop: 8, whiteSpace: 'pre-wrap' }}>
                {selectedRequest.description}
              </Typography.Paragraph>
            </div>

            <div>
              <Typography.Text strong>Статус</Typography.Text>
              <Select
                value={selectedRequest.status}
                options={statusOptions}
                style={{ width: '100%', marginTop: 8 }}
                onChange={(nextStatus: DevRequestStatus) => updateRequest(selectedRequest.id, { status: nextStatus })}
              />
            </div>
          </Space>
        ) : null}
      </Modal>
    </div>
  );
}

export default DevCabinetPage;
