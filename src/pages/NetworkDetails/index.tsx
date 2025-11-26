import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Descriptions, Form, Input, Space, Tabs, Typography, message, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { getDeviations, getLogs, getNetworks, getTopology, updateNetwork } from '../../api/networks';
import NetworkTopology from '../../components/NetworkTopology';
import LogsTable from '../../components/LogsTable';
import DeviationsTable from '../../components/DeviationsTable';
import { Deviation, LogEntry, Network, NetworkUpdateRequest, Topology } from '../../types/api';

export default function NetworkDetailsPage() {
  const { networkId } = useParams<{ networkId: string }>();
  const queryClient = useQueryClient();
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [deviations, setDeviations] = useState<Deviation[] | undefined>(undefined);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const networksQuery = useQuery({ queryKey: ['networks'], queryFn: getNetworks });
  const network = useMemo(() =>
    networksQuery.data?.find((item) => item.id === networkId),
  [networksQuery.data, networkId]);

  const topologyQuery = useQuery<Topology>({
    queryKey: ['topology', networkId],
    queryFn: () => getTopology(networkId || ''),
    enabled: !!networkId,
  });

  const logsQuery = useQuery<LogEntry[]>({
    queryKey: ['logs', networkId, dateRange?.[0]?.toISOString(), dateRange?.[1]?.toISOString()],
    queryFn: () =>
      getLogs(networkId || '', {
        date_from: dateRange?.[0]?.toISOString(),
        date_to: dateRange?.[1]?.toISOString(),
      }),
    enabled: !!networkId,
  });

  const editMutation = useMutation({
    mutationFn: (values: NetworkUpdateRequest) => updateNetwork(networkId || '', values),
    onSuccess: () => {
      message.success('Сеть обновлена');
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Не удалось обновить сеть'),
  });

  useEffect(() => {
    if (networkId && selectedLog) {
      getDeviations(networkId, selectedLog.id)
        .then(setDeviations)
        .catch(() => message.error('Не удалось загрузить отклонения'));
    }
  }, [networkId, selectedLog]);

  useEffect(() => {
    if (!selectedLog && logsQuery.data && logsQuery.data.length > 0) {
      setSelectedLog(logsQuery.data[0]);
    }
  }, [logsQuery.data, selectedLog]);

  if (!networkId) return <Typography.Text>Сеть не найдена</Typography.Text>;

  return (
    <div className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Детали сети
          </Typography.Title>
          <Typography.Text type="secondary">
            Вся информация, топология и журнал отклонений в одном месте.
          </Typography.Text>
        </div>
        <Tag color="blue">ID: {networkId}</Tag>
      </div>
      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: 'Информация',
            children: (
              <div style={{ maxWidth: 600 }}>
                {network ? (
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="ID">{network.id}</Descriptions.Item>
                    <Descriptions.Item label="ID рабочей области">{network.workspace_id}</Descriptions.Item>
                    <Descriptions.Item label="Название">{network.name}</Descriptions.Item>
                    <Descriptions.Item label="Описание">{network.description}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Typography.Text>Загрузка информации...</Typography.Text>
                )}
                <div style={{ marginTop: 16 }}>
                  <Typography.Title level={5}>Редактировать сеть</Typography.Title>
                  <NetworkEditForm
                    initialValues={network}
                    onSubmit={(values) => editMutation.mutate(values)}
                    loading={editMutation.isPending}
                  />
                </div>
              </div>
            ),
          },
          {
            key: 'topology',
            label: 'Топология',
            children: (
              <div className="topology-container">
                {topologyQuery.isLoading && <Typography.Text>Загрузка топологии...</Typography.Text>}
                {topologyQuery.error && (
                  <Typography.Text type="danger">Не удалось загрузить топологию</Typography.Text>
                )}
                {topologyQuery.data && <NetworkTopology topology={topologyQuery.data} />}
              </div>
            ),
          },
          {
            key: 'logs',
            label: 'Журналы и отклонения',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Space size={12} wrap>
                  <DatePicker.RangePicker
                    showTime
                    value={dateRange as [Dayjs | null, Dayjs | null] | null}
                    onChange={(vals) => setDateRange(vals)}
                  />
                  <Button onClick={() => logsQuery.refetch()}>Обновить</Button>
                </Space>
                <LogsTable
                  data={logsQuery.data}
                  loading={logsQuery.isLoading}
                  onSelect={(log) => setSelectedLog(log)}
                />
                <div>
                  <Typography.Title level={5}>Отклонения</Typography.Title>
                  <DeviationsTable data={deviations} />
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

function NetworkEditForm({
  initialValues,
  onSubmit,
  loading,
}: {
  initialValues?: Network;
  onSubmit: (values: NetworkUpdateRequest) => void;
  loading?: boolean;
}) {
  const [form] = Form.useForm<NetworkUpdateRequest>();
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    }
  }, [initialValues, form]);

  return (
    <Form form={form} layout="vertical" onFinish={onSubmit}>
      <Form.Item name="workspace_id" label="ID рабочей области">
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Название">
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Описание">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Сохранить
      </Button>
    </Form>
  );
}
