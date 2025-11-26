import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Table, Typography, message, Card } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createUser, deleteUser, getUsers, updateUser } from '../../api/users';
import { User, UserCreateRequest, UserUpdateRequest } from '../../types/api';

export default function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const createMutation = useMutation({
    mutationFn: (values: UserCreateRequest) => createUser(values),
    onSuccess: () => {
      message.success('Пользователь создан');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Не удалось создать пользователя'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UserUpdateRequest }) => updateUser(id, values),
    onSuccess: () => {
      message.success('Данные обновлены');
      setIsEditOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Не удалось обновить пользователя'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      message.success('Пользователь удалён');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Не удалось удалить пользователя'),
  });

  const columns = useMemo(
    () => [
      { title: 'Имя', dataIndex: 'name', key: 'name' },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      {
        title: 'Действия',
        key: 'actions',
        render: (_: unknown, record: User) => (
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
                  title: 'Удалить пользователя?',
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
              Пользователи
            </Typography.Title>
            <Typography.Text type="secondary">
              Список людей с быстрым переходом к их подпискам.
            </Typography.Text>
          </div>
          <Button onClick={() => navigate('/networks')}>К сетям</Button>
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
          onRow={(record) => ({ onClick: () => navigate(`/users/${record.id}`) })}
        />
      </div>

      <Card title="Создать пользователя" bordered={false} style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
        <Typography.Paragraph type="secondary">
          Оформите нового пользователя без лишних шагов.
        </Typography.Paragraph>
        <UserForm
          onSubmit={(values) => createMutation.mutate(values as UserCreateRequest)}
          loading={createMutation.isPending}
        />
      </Card>

      <Modal
        title="Редактирование пользователя"
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        footer={null}
        destroyOnClose
      >
        {editing && (
          <UserForm
            initialValues={editing}
            onSubmit={(values) => editMutation.mutate({ id: editing.id, values })}
            loading={editMutation.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function UserForm({
  initialValues,
  onSubmit,
  loading,
}: {
  initialValues?: Partial<User>;
  onSubmit: (values: UserCreateRequest | UserUpdateRequest) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm();
  return (
    <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onSubmit}>
      <Form.Item name="name" label="Имя" rules={[{ required: true, message: 'Введите имя' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Укажите корректный email' }]}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Сохранить
      </Button>
    </Form>
  );
}
