import { useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Space, Table, Typography, message } from 'antd';
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editing, setEditing] = useState<Network | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ['networks'], queryFn: getNetworks });

  const createMutation = useMutation({
    mutationFn: (values: NetworkCreateRequest) => createNetwork(values),
    onSuccess: () => {
      message.success('Network created');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Failed to create network'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: NetworkUpdateRequest }) =>
      updateNetwork(id, values),
    onSuccess: () => {
      message.success('Network updated');
      setIsEditOpen(false);
      setEditing(null);
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Failed to update network'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNetwork(id),
    onSuccess: () => {
      message.success('Network deleted');
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Failed to delete network'),
  });

  const columns = useMemo(
    () => [
      { title: 'Name', dataIndex: 'name', key: 'name' },
      { title: 'Description', dataIndex: 'description', key: 'description' },
      { title: 'Workspace ID', dataIndex: 'workspace_id', key: 'workspace_id' },
      {
        title: 'Actions',
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
              Edit
            </Button>
            <Button
              type="link"
              danger
              onClick={(e) => {
                e.stopPropagation();
                Modal.confirm({
                  title: 'Delete network?',
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
          Networks
        </Typography.Title>
        <Button type="primary" onClick={() => setIsCreateOpen(true)}>
          Create Network
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
        onRow={(record) => ({
          onClick: () => navigate(`/networks/${record.id}`),
        })}
      />

      <Modal
        title="Create Network"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
        destroyOnClose
      >
        <NetworkForm
          onSubmit={(values) => createMutation.mutate(values as NetworkCreateRequest)}
          loading={createMutation.isPending}
        />
      </Modal>

      <Modal
        title="Edit Network"
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
      <Form.Item name="workspace_id" label="Workspace ID" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Description" rules={[{ required: true }]}>
        <Input.TextArea rows={3} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Submit
      </Button>
    </Form>
  );
}
