import { useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Descriptions, Form, Input, Space, Tabs, Typography, message } from 'antd';
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
      message.success('Network updated');
      queryClient.invalidateQueries({ queryKey: ['networks'] });
    },
    onError: () => message.error('Failed to update network'),
  });

  useEffect(() => {
    if (networkId && selectedLog) {
      getDeviations(networkId, selectedLog.id)
        .then(setDeviations)
        .catch(() => message.error('Failed to load deviations'));
    }
  }, [networkId, selectedLog]);

  if (!networkId) return <Typography.Text>Network not found</Typography.Text>;

  return (
    <div className="content-card">
      <Typography.Title level={3}>Network details</Typography.Title>
      <Tabs
        defaultActiveKey="info"
        items={[
          {
            key: 'info',
            label: 'Information',
            children: (
              <div style={{ maxWidth: 600 }}>
                {network ? (
                  <Descriptions bordered column={1} size="small">
                    <Descriptions.Item label="ID">{network.id}</Descriptions.Item>
                    <Descriptions.Item label="Workspace ID">{network.workspace_id}</Descriptions.Item>
                    <Descriptions.Item label="Name">{network.name}</Descriptions.Item>
                    <Descriptions.Item label="Description">{network.description}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Typography.Text>Loading network info...</Typography.Text>
                )}
                <div style={{ marginTop: 16 }}>
                  <Typography.Title level={5}>Edit network</Typography.Title>
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
            label: 'Topology',
            children: (
              <div className="topology-container">
                {topologyQuery.isLoading && <Typography.Text>Loading topology...</Typography.Text>}
                {topologyQuery.error && (
                  <Typography.Text type="danger">Failed to load topology</Typography.Text>
                )}
                {topologyQuery.data && <NetworkTopology topology={topologyQuery.data} />}
              </div>
            ),
          },
          {
            key: 'logs',
            label: 'Logs & Deviations',
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Space>
                  <DatePicker.RangePicker
                    showTime
                    value={dateRange as [Dayjs | null, Dayjs | null] | null}
                    onChange={(vals) => setDateRange(vals)}
                  />
                  <Button onClick={() => logsQuery.refetch()}>Refresh</Button>
                </Space>
                <LogsTable
                  data={logsQuery.data}
                  loading={logsQuery.isLoading}
                  onSelect={(log) => setSelectedLog(log)}
                />
                <div>
                  <Typography.Title level={5}>Deviations</Typography.Title>
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
      <Form.Item name="workspace_id" label="Workspace ID">
        <Input />
      </Form.Item>
      <Form.Item name="name" label="Name">
        <Input />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>
        Save
      </Button>
    </Form>
  );
}
