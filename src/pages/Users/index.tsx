import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Table, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createUser, deleteUser, getUsers, updateUser } from '../../api/users';
import { User, UserCreateRequest, UserUpdateRequest } from '../../types/api';

export default function UsersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const createMutation = useMutation({
    mutationFn: (values: UserCreateRequest) => createUser(values),
    onSuccess: () => {
      message.success('User created');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Failed to create user'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UserUpdateRequest }) => updateUser(id, values),
    onSuccess: () => {
      message.success('User updated');
      setIsEditOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Failed to update user'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      message.success('User deleted');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => message.error('Failed to delete user'),
  });

  const columns = useMemo(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Email', dataIndex: 'email', key: 'email' },
      {
        title: 'Actions',
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
              Edit
            </Button>
            <Button
              type="link"
              danger
              onClick={(e) => {
                e.stopPropagation();
                Modal.confirm({
                  title: 'Delete user?',
                  onOk: () => deleteMutation.mutate(record.id),
                });
              }}
            >
              Delete
            </Button>
          </Space>
        ),
      },
    ],
    [deleteMutation],
  );

  return (
    <div className="content-card">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Users
        </Typography.Title>
        <Button type="primary" onClick={() => setIsCreateOpen(true)}>
          Create User
        </Button>
      </div>
      {isLoading && <Typography.Text>Loading...</Typography.Text>}
      {error && (
        <Typography.Text type="danger">{(error as Error).message || 'Failed to load'}</Typography.Text>
      )}
      <Table
        rowKey="id"
        dataSource={data}
        columns={columns}
        loading={isLoading}
        onRow={(record) => ({ onClick: () => navigate(`/users/${record.id}`) })}
      />

      <Modal
        title="Create User"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <UserForm
          onSubmit={(values) => createMutation.mutate(values as UserCreateRequest)}
          loading={createMutation.isPending}
        />
      </Modal>

      <Modal
        title="Edit User"
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
      <Form.Item name="name" label="Name" rules={[{ required: true }]}> 
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}> 
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Submit
      </Button>
    </Form>
  );
}
