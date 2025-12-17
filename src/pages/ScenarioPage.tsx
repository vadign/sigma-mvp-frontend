import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Row, Space, Typography, message } from 'antd';
import dayjs from 'dayjs';
import LevelTag from '../components/LevelTag';
import { fetchDeviations, fetchEvents, fetchLogs, fetchNetworks, updateDeviations } from '../api/client';
import { DeviationGetResponse, EventResponse, NetworkResponse } from '../api/types';
import { YandexTopologyMap } from '../components/maps/YandexTopologyMap';

function ScenarioPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [networkId, setNetworkId] = useState<string | undefined>();
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [latestEvent, setLatestEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setNetworkId(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  useEffect(() => {
    setSelectedEdgeId(null);
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

  const highlightStyles = useMemo(() => {
    const styles: Record<number, { color?: string; width?: number; opacity?: number }> = {};
    deviations.forEach((d) => {
      if (!d.level) return;
      styles[d.edge_id] = { color: '#ff4d4f', width: d.level === 3 ? 6 : 4, opacity: 0.9 };
    });
    return styles;
  }, [deviations]);

  const criticalDeviation = deviations.find((d) => d.level === 3) || deviations[0];

  return (
    <div>
      <Typography.Title level={3}>Сквозной кейс</Typography.Title>
      <Typography.Paragraph>
        Шаги: событие в теплосети → отклонения → регламент → уведомления → дашборд мэра.
      </Typography.Paragraph>

      <Button type="primary" onClick={runScenario} loading={loading} disabled={!networkId}>
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
                  <li key={d.id} onClick={() => setSelectedEdgeId(d.edge_id)} style={{ cursor: 'pointer' }}>
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
            {networkId ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <YandexTopologyMap
                  networkId={networkId}
                  height={360}
                  highlightEdges={highlightStyles}
                  selectedEdgeId={selectedEdgeId}
                  onEdgeSelect={setSelectedEdgeId}
                />
                <Typography.Text type="secondary">
                  Топология подтягивается из API сети. Нажмите на ребро, чтобы увидеть показатели и выделить его в
                  списке отклонений.
                </Typography.Text>
              </Space>
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
