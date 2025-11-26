import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Table, Typography, message, Card } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  createNetwork,
  deleteNetwork,
  getNetworks,
  updateNetwork,
} from '../../api/networks';
import { Network, NetworkCreateRequest, NetworkUpdateRequest } from '../../types/api';

export default function NetworksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Network | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['networks'], queryFn: getNetworks });

  const createMutation = useMutation({
    mutationFn: (values: NetworkCreateRequest) => createNetwork(values),
    onSuccess: () => {
      message.success('Сеть создана');
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Не удалось создать сеть'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: NetworkUpdateRequest }) =>
      updateNetwork(id, values),
    onSuccess: () => {
      message.success('Сеть обновлена');
      setIsEditOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Не удалось обновить сеть'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNetwork(id),
    onSuccess: () => {
      message.success('Сеть удалена');
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Не удалось удалить сеть'),
  });

  const columns = useMemo(
    () => [
      { title: 'Название', dataIndex: 'name', key: 'name' },
      { title: 'Описание', dataIndex: 'description', key: 'description' },
      { title: 'ID рабочей области', dataIndex: 'workspace_id', key: 'workspace_id' },
      {
        title: 'Действия',
        key: 'actions',
        render: (_: unknown, record: Network) => (
          <Space>
            <Button
              type="link"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(record);
                setIsEditOpen(true);
              }}
            >
              Редактировать
            </Button>
            <Button
              type="link"
              danger
              onClick={(e) => {
                e.stopPropagation();
                Modal.confirm({
                  title: 'Удалить сеть?',
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            >
              Удалить
            </Button>
          </Space>
        ),
      },
    ],
    [deleteMutation],
  );

  return (
    <div className="content-card" style={{ display: 'grid', gap: 20, gridTemplateColumns: '2fr 1fr' }}>
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <Typography.Title level={3} style={{ margin: 0 }}>
              Сети
            </Typography.Title>
            <Typography.Text type="secondary">
              Управляйте сетями и переходите к деталям в один клик.
            </Typography.Text>
          </div>
          <Button type="primary" onClick={() => navigate('/admin')}>
            Администрирование
          </Button>
        </div>
        {isLoading && <Typography.Text>Загрузка...</Typography.Text>}
        {error && (
          <Typography.Text type="danger">{(error as Error).message || 'Не удалось загрузить'}</Typography.Text>
        )}
        <Table
          rowKey="id"
          dataSource={data}
          columns={columns}
          loading={isLoading}
          size="middle"
          onRow={(record) => ({
            onClick: () => navigate(`/networks/${record.id}`),
          })}
        />
      </div>

      <Card title="Быстрое создание" bordered={false} style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <Typography.Paragraph type="secondary">
          Добавьте новую сеть без переходов и дополнительных кликов.
        </Typography.Paragraph>
        <NetworkForm
          onSubmit={(values) => createMutation.mutate(values as NetworkCreateRequest)}
          loading={createMutation.isPending}
        />
      </Card>

      <Modal
        title="Редактирование сети"
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        footer={null}
        destroyOnClose
      >
        {editing && (
          <NetworkForm
            initialValues={editing}
            onSubmit={(values) =>
              editMutation.mutate({ id: editing.id, values: values as NetworkUpdateRequest })
            }
            loading={editMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function NetworkForm({
  initialValues,
  onSubmit,
  loading,
}: {
  initialValues?: Partial<Network>;
  onSubmit: (values: NetworkCreateRequest | NetworkUpdateRequest) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm();
  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
      <Form.Item
        name="workspace_id"
        label="ID рабочей области"
        rules={[{ required: true, message: 'Укажите ID рабочей области' }]}
      >
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название сети' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Описание" rules={[{ required: true, message: 'Добавьте описание' }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Сохранить
      </Button>
    </Form>
  );
}
