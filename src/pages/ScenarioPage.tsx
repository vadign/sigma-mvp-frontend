import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Row, Space, Typography, message } from 'antd';
import dayjs from 'dayjs';
import TopologyGraph from '../components/TopologyGraph';
import LevelTag from '../components/LevelTag';
import {
  fetchDeviations,
  fetchEvents,
  fetchLogs,
  fetchNetworks,
  fetchTopology,
  updateDeviations,
} from '../api/client';
import { DeviationGetResponse, EventResponse, NetworkResponse, TopologyGetResponse } from '../api/types';

function ScenarioPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [networkId, setNetworkId] = useState<string | undefined>();
  const [topology, setTopology] = useState<TopologyGetResponse | null>(null);
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [latestEvent, setLatestEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setNetworkId(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  useEffect(() => {
    if (!networkId) return;
    fetchTopology(networkId).then(setTopology).catch(() => message.error('Ошибка загрузки топологии'));
  }, [networkId]);

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
      }
      const latest = await fetchEvents({ limit: 1, order: 'desc' });
      setLatestEvent(latest[0]);
      message.success('Сценарий обновлён');
    } catch (e) {
      message.error('Не удалось выполнить сценарий');
    } finally {
      setLoading(false);
    }
  };

  const hotEdges = useMemo(() => deviations.filter((d) => d.level === 3).map((d) => d.edge_id), [deviations]);
  const criticalDeviation = deviations.find((d) => d.level === 3) || deviations[0];

  return (
    <div>
      <Typography.Title level={3}>Сквозной кейс</Typography.Title>
      <Typography.Paragraph>
        Шаги: событие в теплосети → отклонения → регламент → уведомления → дашборд мэра.
      </Typography.Paragraph>

      <Button type="primary" onClick={runScenario} loading={loading}>
        Смоделировать аварию в теплосети
      </Button>

      <Row gutter={16} className="page-section">
        <Col span={12}>
          <Card title="Источник данных отправил событие">
            {latestEvent ? (
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(latestEvent.msg, null, 2)}</pre>
            ) : (
              <Typography.Text>Нажмите кнопку, чтобы получить событие.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Ядро Сигма определило отклонения">
            {deviations.length > 0 ? (
              <ul>
                {deviations.map((d) => (
                  <li key={d.id}>
                    Ребро {d.edge_id}, {d.type}: {d.value} / {d.reference} — <LevelTag level={d.level ?? undefined} />
                  </li>
                ))}
              </ul>
            ) : (
              <Typography.Text>Отклонений пока нет.</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="page-section">
        <Col span={12}>
          <Card title="Регламент присвоил критичность и рекомендации">
            {criticalDeviation ? (
              <div>
                <p>
                  Критичность: <LevelTag level={criticalDeviation.level ?? undefined} />
                </p>
                <p>Регламент: {criticalDeviation.regulation || '—'}</p>
                <p>Рекомендация: {criticalDeviation.recommendation || '—'}</p>
              </div>
            ) : (
              <Typography.Text>Нет данных об отклонениях.</Typography.Text>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Оповещение диспетчера и ответственных лиц">
            <Typography.Paragraph>
              Email: [Сигма] Критическое событие в сети {networkId}. Уровень: {criticalDeviation?.level || 3}.
              Рекомендация: {criticalDeviation?.recommendation || 'проверить участок'}.
            </Typography.Paragraph>
            <Typography.Paragraph>
              Telegram: Сигма — новое критическое событие. Узел/ребро {criticalDeviation?.edge_id}. Уровень:
              {criticalDeviation?.level || 3}.
            </Typography.Paragraph>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="page-section">
        <Col span={12}>
          <Card title="Инцидент на дашборде мэра">
            <Typography.Paragraph>
              Последнее событие: {latestEvent ? dayjs(latestEvent.created_at).format('DD.MM HH:mm') : '—'}
            </Typography.Paragraph>
            <Typography.Paragraph>
              Критичных событий уровня 3: {deviations.filter((d) => d.level === 3).length}
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Топология с подсветкой отклонений">
            {topology ? (
              <TopologyGraph nodes={topology.nodes} edges={topology.edges} highlightEdges={hotEdges} />
            ) : (
              <Typography.Text>Загрузка топологии...</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ScenarioPage;
