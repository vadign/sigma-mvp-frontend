import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  message,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import TopologyGraph from '../components/TopologyGraph';
import LevelTag from '../components/LevelTag';
import {
  clearDeviations,
  clearTopology,
  fetchDeviations,
  fetchLogs,
  fetchNetworks,
  fetchTopology,
  updateDeviations,
  updateTopology,
} from '../api/client';
import { DeviationGetResponse, LogsGetResponse, NetworkResponse, TopologyGetResponse } from '../api/types';

function DataAndTopologyPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>();
  const [topology, setTopology] = useState<TopologyGetResponse | null>(null);
  const [logs, setLogs] = useState<LogsGetResponse[]>([]);
  const [selectedLog, setSelectedLog] = useState<number | null>(null);
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeviations, setLoadingDeviations] = useState(false);

  useEffect(() => {
    fetchNetworks()
      .then(setNetworks)
      .catch(() => message.error('Не удалось загрузить сети.'));
  }, []);

  useEffect(() => {
    if (!selectedNetwork) return;
    setLoading(true);
    Promise.all([fetchTopology(selectedNetwork), fetchLogs(selectedNetwork)])
      .then(([topo, logsList]) => {
        setTopology(topo);
        setLogs(logsList);
        if (logsList.length > 0) {
          setSelectedLog(logsList[0].id);
        } else {
          setSelectedLog(null);
          setDeviations([]);
        }
      })
      .catch(() => message.error('Ошибка при загрузке данных по сети'))
      .finally(() => setLoading(false));
  }, [selectedNetwork]);

  useEffect(() => {
    if (!selectedNetwork || selectedLog == null) return;
    setLoadingDeviations(true);
    fetchDeviations(selectedNetwork, selectedLog)
      .then(setDeviations)
      .catch(() => message.error('Не удалось загрузить отклонения'))
      .finally(() => setLoadingDeviations(false));
  }, [selectedNetwork, selectedLog]);

  const deviationColumns: ColumnsType<DeviationGetResponse> = [
    { title: 'Ребро', dataIndex: 'edge_id' },
    { title: 'Тип', dataIndex: 'type' },
    { title: 'Значение', dataIndex: 'value' },
    { title: 'Эталон', dataIndex: 'reference' },
    {
      title: 'Уровень',
      dataIndex: 'level',
      render: (level: DeviationGetResponse['level']) => <LevelTag level={level ?? undefined} />,
    },
    { title: 'Регламент', dataIndex: 'regulation' },
    { title: 'Рекомендация', dataIndex: 'recommendation' },
  ];

  const highlightEdges = useMemo(
    () => deviations.filter((d) => d.level && d.level >= 2).map((d) => d.edge_id),
    [deviations],
  );

  const onAdminAction = async (action: () => Promise<unknown>, successMessage: string) => {
    try {
      await action();
      message.success(successMessage);
      if (selectedNetwork) {
        const topo = await fetchTopology(selectedNetwork);
        setTopology(topo);
      }
    } catch (e) {
      message.error('Операция не удалась');
    }
  };

  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Typography.Title level={3}>Данные и топология</Typography.Title>
          <Typography.Paragraph>
            Выберите сеть, обновите топологию и посмотрите отклонения, подсвеченные на графе.
          </Typography.Paragraph>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={() => onAdminAction(updateTopology, 'Топология обновлена')}>
              Обновить топологию
            </Button>
            <Button danger onClick={() => onAdminAction(clearTopology, 'Топология очищена')}>
              Очистить топологию
            </Button>
            <Button onClick={() => onAdminAction(updateDeviations, 'Отклонения обновлены')}>
              Обновить отклонения
            </Button>
            <Button danger onClick={() => onAdminAction(clearDeviations, 'Отклонения очищены')}>
              Очистить отклонения
            </Button>
          </Space>
        </Col>
      </Row>

      <div className="page-section">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Select
            placeholder="Выберите сеть"
            options={networks.map((n) => ({ label: n.name, value: n.id }))}
            value={selectedNetwork}
            onChange={(val) => setSelectedNetwork(val)}
            style={{ width: 320 }}
          />
          {loading && <Spin />}
          {!loading && topology && (
            <TopologyGraph
              nodes={topology.nodes}
              edges={topology.edges}
              highlightEdges={highlightEdges}
            />
          )}
        </Space>
      </div>

      <Row gutter={16} className="page-section">
        <Col span={8}>
          <Card title="Журнал отклонений">
            <Table<LogsGetResponse>
              rowKey="id"
              dataSource={logs}
              size="small"
              columns={[
                { title: 'ID', dataIndex: 'id' },
                {
                  title: 'Время',
                  dataIndex: 'timestamp',
                  render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm:ss'),
                },
              ]}
              onRow={(record) => ({
                onClick: () => setSelectedLog(record.id),
                style: {
                  cursor: 'pointer',
                  background: selectedLog === record.id ? '#e6f4ff' : undefined,
                },
              })}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={16}>
          <Card title="Отклонения по журналу">
            <Table
              rowKey="id"
              dataSource={deviations}
              columns={deviationColumns}
              loading={loadingDeviations}
              pagination={{ pageSize: 8 }}
              size="small"
            />
          </Card>
        </Col>
      </Row>

      <Typography.Paragraph className="helper-text">
        Отклонения показывают, где параметры сети выходят за пределы норм. Регламент определяет уровень
        критичности (level) и рекомендацию для диспетчера.
      </Typography.Paragraph>
    </div>
  );
}

export default DataAndTopologyPage;

