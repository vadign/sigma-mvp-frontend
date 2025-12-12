import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Table,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import LevelTag from '../components/LevelTag';
import {
  createSubscription,
  createUser,
  deleteSubscription,
  fetchNetworks,
  fetchSubscriptions,
  fetchUsers,
  updateSubscription,
} from '../api/client';
import { EmailSubscriptionResponse, NetworkResponse, UserResponse } from '../api/types';

function NotificationsPage() {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
  const [subscriptions, setSubscriptions] = useState<EmailSubscriptionResponse[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  const loadUsers = () => {
    fetchUsers()
      .then(setUsers)
      .catch(() => message.error('Не удалось загрузить пользователей'));
  };

  useEffect(() => {
    loadUsers();
    fetchNetworks().then(setNetworks);
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setLoadingSubs(true);
    fetchSubscriptions(selectedUser.id)
      .then(setSubscriptions)
      .catch(() => message.error('Не удалось загрузить подписки'))
      .finally(() => setLoadingSubs(false));
  }, [selectedUser]);

  const onCreateUser = async (values: { name: string; email: string }) => {
    setCreatingUser(true);
    try {
      await createUser(values.name, values.email);
      message.success('Пользователь создан');
      loadUsers();
    } catch (e) {
      message.error('Не удалось создать пользователя');
    } finally {
      setCreatingUser(false);
    }
  };

  const onCreateSubscription = async (values: { network_id: string; level: number; subject: string }) => {
    if (!selectedUser) return;
    try {
      await createSubscription(selectedUser.id, {
        network_id: values.network_id,
        level: values.level as 1 | 2 | 3,
        subject: values.subject as 'deviations' | 'events',
      });
      message.success('Подписка создана');
      const list = await fetchSubscriptions(selectedUser.id);
      setSubscriptions(list);
    } catch (e) {
      message.error('Не удалось создать подписку');
    }
  };

  const onUpdateSubscription = async (subscription: EmailSubscriptionResponse, values: any) => {
    if (!selectedUser) return;
    try {
      await updateSubscription(selectedUser.id, subscription.id, {
        level: values.level as 1 | 2 | 3 | null,
        subject: (values.subject as 'deviations' | 'events') ?? null,
      });
      message.success('Подписка обновлена');
      const list = await fetchSubscriptions(selectedUser.id);
      setSubscriptions(list);
    } catch (e) {
      message.error('Не удалось обновить подписку');
    }
  };

  const onDeleteSubscription = async (subscription: EmailSubscriptionResponse) => {
    if (!selectedUser) return;
    await deleteSubscription(selectedUser.id, subscription.id);
    message.success('Подписка удалена');
    setSubscriptions(await fetchSubscriptions(selectedUser.id));
  };

  const networkName = useMemo(
    () => Object.fromEntries(networks.map((n) => [n.id, n.name])),
    [networks],
  );

  return (
    <div>
      <Typography.Title level={3}>Уведомления и подписки</Typography.Title>
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Пользователи">
            <Table<UserResponse>
              rowKey="id"
              dataSource={users}
              columns={[
                { title: 'Имя', dataIndex: 'name' },
                { title: 'Email', dataIndex: 'email' },
                {
                  title: 'Создан',
                  dataIndex: 'created_at',
                  render: (value: string) => dayjs(value).format('DD.MM.YYYY'),
                },
              ]}
              onRow={(record) => ({
                onClick: () => setSelectedUser(record),
                style: { cursor: 'pointer', background: selectedUser?.id === record.id ? '#e6f4ff' : undefined },
              })}
              pagination={false}
            />
            <Typography.Title level={5} style={{ marginTop: 12 }}>
              Создать пользователя
            </Typography.Title>
            <Form layout="inline" onFinish={onCreateUser}>
              <Form.Item name="name" rules={[{ required: true, message: 'Имя обязательно' }]}> 
                <Input placeholder="Имя" />
              </Form.Item>
              <Form.Item name="email" rules={[{ required: true, message: 'Email обязателен' }]}> 
                <Input placeholder="Email" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={creatingUser}>
                  Создать
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Подписки пользователя">
            {selectedUser ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <Table<EmailSubscriptionResponse>
                  rowKey="id"
                  loading={loadingSubs}
                  dataSource={subscriptions}
                  pagination={false}
                  columns={[
                    { title: 'Сеть', dataIndex: 'network_id', render: (id: string) => networkName[id] || id },
                    { title: 'Тип', dataIndex: 'subject' },
                    {
                      title: 'Уровень',
                      dataIndex: 'level',
                      render: (level: number) => <LevelTag level={level} />,
                    },
                    {
                      title: 'Создана',
                      dataIndex: 'created_at',
                      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
                    },
                    {
                      title: 'Действия',
                      render: (_, record) => (
                        <Space>
                          <Button
                            size="small"
                            onClick={() =>
                              onUpdateSubscription(record, {
                                level: record.level,
                                subject: record.subject,
                              })
                            }
                          >
                            Обновить
                          </Button>
                          <Button size="small" danger onClick={() => onDeleteSubscription(record)}>
                            Удалить
                          </Button>
                        </Space>
                      ),
                    },
                  ]}
                />

                <Card size="small" title="Добавить подписку">
                  <Form layout="vertical" onFinish={onCreateSubscription}>
                    <Form.Item
                      name="network_id"
                      label="Сеть"
                      rules={[{ required: true, message: 'Укажите сеть' }]}
                    >
                      <Select options={networks.map((n) => ({ value: n.id, label: n.name }))} />
                    </Form.Item>
                    <Form.Item
                      name="level"
                      label="Уровень критичности"
                      rules={[{ required: true, message: 'Укажите уровень' }]}
                    >
                      <Select
                        options={[
                          { value: 1, label: '1' },
                          { value: 2, label: '2' },
                          { value: 3, label: '3' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      name="subject"
                      label="Тип подписки"
                      rules={[{ required: true, message: 'Укажите тип' }]}
                    >
                      <Select
                        options={[
                          { value: 'deviations', label: 'Отклонения' },
                          { value: 'events', label: 'События' },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit">
                        Добавить
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Space>
            ) : (
              <Typography.Text>Выберите пользователя, чтобы управлять подписками.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

    </div>
  );
}

export default NotificationsPage;
