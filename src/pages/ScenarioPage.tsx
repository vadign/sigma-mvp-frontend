import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Typography, message } from 'antd';
import LevelTag from '../components/LevelTag';
import { fetchDeviations, fetchLogs, fetchNetworks, updateDeviations } from '../api/client';
import { DeviationGetResponse, NetworkResponse } from '../api/types';
import { formatEdgeShortLabel, getDeviationTypeLabel } from '../utils/topologyLabels';

function ScenarioPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [networkId, setNetworkId] = useState<string | undefined>();
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setNetworkId(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  const runScenario = async () => {
    if (!networkId) return;
    setLoading(true);
    try {
      await updateDeviations();
      const logs = await fetchLogs(networkId);
      if (logs.length > 0) {
        const lastLog = logs[0];
        const devs = await fetchDeviations(networkId, lastLog.id);
        setDeviations(devs);
      message.success('Сценарий обновлён');
    } catch (e) {
      message.error('Не удалось выполнить сценарий');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={3} className="page-title">
        Сквозной кейс
      </Typography.Title>

      <Button type="primary" onClick={runScenario} loading={loading} disabled={!networkId}>
        Смоделировать аварию в теплосети
      </Button>

      <Row gutter={16} className="page-section">
        <Col span={24}>
          <Card title="Ядро Сигма определило отклонения">
            {deviations.length > 0 ? (
              <ul>
                {deviations.map((d) => (
                  <li key={d.id}>
                    {formatEdgeShortLabel(d.edge_id)}, {getDeviationTypeLabel(d.type)}: {d.value} / {d.reference} —{' '}
                    <LevelTag level={d.level ?? undefined} />
                  </li>
                ))}
              </ul>
            ) : (
              <Typography.Text>Отклонений пока нет.</Typography.Text>
            )}
          </Card>
        </Col>
    </div>
  );
}

export default ScenarioPage;