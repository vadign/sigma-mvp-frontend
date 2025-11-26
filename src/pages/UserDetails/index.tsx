import { useEffect, useMemo, useState } from 'react';
import { Button, Descriptions, Form, Input, Modal, Select, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { createSubscription, deleteSubscription, getSubscriptions, updateSubscription } from '../../api/subscriptions';
import { getNetworks } from '../../api/networks';
import { deleteUser, getUser, updateUser } from '../../api/users';
import { DeviationLevel, Network, Subscription, SubscriptionCreateRequest, User, UserUpdateRequest } from '../../types/api';
import SubscriptionsTable from '../../components/SubscriptionsTable';

export default function UserDetailsPage() {
  const { userId } = useParams<{ userId: string }>();
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddSubOpen, setIsAddSubOpen] = useState(false);

  const userQuery = useQuery({ queryKey: ['user', userId], queryFn: () => getUser(userId || ''), enabled: !!userId });
  const subscriptionsQuery = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: () => getSubscriptions(userId || ''),
    enabled: !!userId,
  });
  const networksQuery = useQuery({ queryKey: ['networks'], queryFn: getNetworks });

  const editMutation = useMutation({
    mutationFn: (values: UserUpdateRequest) => updateUser(userId || '', values),
    onSuccess: () => {
      message.success('User updated');
      setIsEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: () => message.error('Failed to update user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => deleteUser(userId || ''),
    onSuccess: () => message.success('User deleted'),
    onError: () => message.error('Failed to delete user'),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (payload: SubscriptionCreateRequest) => createSubscription(userId || '', payload),
    onSuccess: () => {
      message.success('Subscription created');
      setIsAddSubOpen(false);
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Failed to create subscription'),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, level }: { id: number; level: DeviationLevel }) =>
      updateSubscription(userId || '', id, { level }),
    onSuccess: () => {
      message.success('Subscription updated');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Failed to update subscription'),
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: (id: number) => deleteSubscription(userId || '', id),
    onSuccess: () => {
      message.success('Subscription deleted');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Failed to delete subscription'),
  });

  const networkOptions = useMemo(
    () => networksQuery.data?.map((n: Network) => ({ label: n.name, value: n.id })) ?? [],
    [networksQuery.data],
  );

  if (!userId) return <Typography.Text>User not found</Typography.Text>;

  return (
    <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3}>User details</Typography.Title>
      {userQuery.isLoading && <Typography.Text>Loading user...</Typography.Text>}
      {userQuery.data && (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="ID">{userQuery.data.id}</Descriptions.Item>
          <Descriptions.Item label="Name">{userQuery.data.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{userQuery.data.email}</Descriptions.Item>
        </Descriptions>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <Button type="primary" onClick={() => setIsEditOpen(true)}>
          Edit user
        </Button>
        <Button danger onClick={() => deleteUserMutation.mutate()}>Delete user</Button>
      </div>

      <div>
        <Typography.Title level={4}>Subscriptions</Typography.Title>
        <Button type="primary" onClick={() => setIsAddSubOpen(true)} style={{ marginBottom: 12 }}>
          Add subscription
        </Button>
        <SubscriptionsTable
          data={subscriptionsQuery.data}
          onUpdateLevel={(id, level) => updateSubscriptionMutation.mutate({ id, level })}
          onDelete={(id) => deleteSubscriptionMutation.mutate(id)}
        />
      </div>

      <Modal
        title="Edit user"
        open={isEditOpen}
        onCancel={() => setIsEditOpen(false)}
        footer={null}
        destroyOnClose
      >
        {userQuery.data && (
          <UserEditForm
            initialValues={userQuery.data}
            onSubmit={(values) => editMutation.mutate(values)}
            loading={editMutation.isPending}
          />
        )}
      </Modal>

      <Modal
        title="Add subscription"
        open={isAddSubOpen}
        onCancel={() => setIsAddSubOpen(false)}
        footer={null}
        destroyOnClose
      >
        <SubscriptionForm
          networkOptions={networkOptions}
          onSubmit={(values) => createSubscriptionMutation.mutate(values as SubscriptionCreateRequest)}
          loading={createSubscriptionMutation.isPending}
        />
      </Modal>
    </div>
  );
}

function UserEditForm({
  initialValues,
  onSubmit,
  loading,
}: {
  initialValues: User;
  onSubmit: (values: UserUpdateRequest) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<UserUpdateRequest>();
  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Save
      </Button>
    </Form>
  );
}

function SubscriptionForm({
  networkOptions,
  onSubmit,
  loading,
}: {
  networkOptions: { label: string; value: string }[];
  onSubmit: (values: SubscriptionCreateRequest) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<SubscriptionCreateRequest>();
  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="network_id" label="Network" rules={[{ required: true }]}>
        <Select options={networkOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item name="level" label="Level" rules={[{ required: true }]}>
        <Select options={[1, 2, 3].map((lvl) => ({ label: lvl, value: lvl }))} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Save
      </Button>
    </Form>
  );
}
