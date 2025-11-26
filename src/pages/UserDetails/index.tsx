import { useEffect, useMemo, useState } from 'react';
import { Button, Descriptions, Form, Input, Select, Typography, message, Card } from 'antd';
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
      message.success('Профиль обновлён');
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
    onError: () => message.error('Не удалось обновить пользователя'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: () => deleteUser(userId || ''),
    onSuccess: () => message.success('Пользователь удалён'),
    onError: () => message.error('Не удалось удалить пользователя'),
  });

  const createSubscriptionMutation = useMutation({
    mutationFn: (payload: SubscriptionCreateRequest) => createSubscription(userId || '', payload),
    onSuccess: () => {
      message.success('Подписка добавлена');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Не удалось создать подписку'),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: ({ id, level }: { id: number; level: DeviationLevel }) =>
      updateSubscription(userId || '', id, { level }),
    onSuccess: () => {
      message.success('Уровень обновлён');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Не удалось обновить подписку'),
  });

  const deleteSubscriptionMutation = useMutation({
    mutationFn: (id: number) => deleteSubscription(userId || '', id),
    onSuccess: () => {
      message.success('Подписка удалена');
      queryClient.invalidateQueries({ queryKey: ['subscriptions', userId] });
    },
    onError: () => message.error('Не удалось удалить подписку'),
  });

  const networkOptions = useMemo(
    () => networksQuery.data?.map((n: Network) => ({ label: n.name, value: n.id })) ?? [],
    [networksQuery.data],
  );

  if (!userId) return <Typography.Text>Пользователь не найден</Typography.Text>;

  return (
    <div className="content-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3}>Профиль пользователя</Typography.Title>
      {userQuery.isLoading && <Typography.Text>Загрузка пользователя...</Typography.Text>}
      {userQuery.data && (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="ID">{userQuery.data.id}</Descriptions.Item>
          <Descriptions.Item label="Имя">{userQuery.data.name}</Descriptions.Item>
          <Descriptions.Item label="Email">{userQuery.data.email}</Descriptions.Item>
        </Descriptions>
      )}
      <Button danger onClick={() => deleteUserMutation.mutate()} style={{ alignSelf: 'flex-start' }}>
        Удалить пользователя
      </Button>

      {userQuery.data && (
        <Card title="Редактирование профиля" bordered={false} style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
          <UserEditForm
            initialValues={userQuery.data}
            onSubmit={(values) => editMutation.mutate(values)}
            loading={editMutation.isPending}
          />
        </Card>
      )}

      <div>
        <Typography.Title level={4}>Подписки</Typography.Title>
        <Card
          title="Новая подписка"
          bordered={false}
          style={{ marginBottom: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}
        >
          <SubscriptionForm
            networkOptions={networkOptions}
            onSubmit={(values) => createSubscriptionMutation.mutate(values as SubscriptionCreateRequest)}
            loading={createSubscriptionMutation.isPending}
          />
        </Card>
        <SubscriptionsTable
          data={subscriptionsQuery.data}
          onUpdateLevel={(id, level) => updateSubscriptionMutation.mutate({ id, level })}
          onDelete={(id) => deleteSubscriptionMutation.mutate(id)}
        />
      </div>
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
      <Form.Item name="name" label="Имя" rules={[{ required: true, message: 'Введите имя' }]}> 
        <Input />
      </Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Укажите корректный email' }]}> 
        <Input />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Сохранить
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
      <Form.Item name="network_id" label="Сеть" rules={[{ required: true }]}> 
        <Select options={networkOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item name="level" label="Уровень" rules={[{ required: true }]}> 
        <Select options={[1, 2, 3].map((lvl) => ({ label: lvl, value: lvl }))} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading} block>
        Сохранить
      </Button>
    </Form>
  );
}
