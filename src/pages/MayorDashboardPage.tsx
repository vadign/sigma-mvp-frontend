import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Col,
  DatePicker,
  List,
  Row,
  Select,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
  Segmented,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import LevelTag from '../components/LevelTag';
import { fetchDeviations, fetchEvents, fetchLogs, fetchNetworks } from '../api/client';
import { DeviationGetResponse, EventResponse, NetworkResponse } from '../api/types';
import { getSeverityMeta } from '../utils/severity';
import { YandexTopologyMap } from '../components/maps/YandexTopologyMap';
import { formatEdgeShortLabel, getDeviationTypeLabel } from '../utils/topologyLabels';

const { RangePicker } = DatePicker;
const DEFAULT_DATE_RANGE: [Dayjs, Dayjs] = [dayjs('2026-02-01'), dayjs('2026-02-28')];

function MayorDashboardPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>();
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>(DEFAULT_DATE_RANGE);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [viewMode, setViewMode] = useState<'deviations' | 'events'>('deviations');
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setSelectedNetwork(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  useEffect(() => {
    if (viewMode !== 'events') return;
    setLoading(true);
    fetchEvents({ limit: 100, order: 'desc', level: level ?? undefined })
      .then(setEvents)
      .catch(() => message.error('Ошибка загрузки событий'))
      .finally(() => setLoading(false));
  }, [level, viewMode]);

  useEffect(() => {
    const loadDeviations = async () => {
      if (!selectedNetwork) return;
      try {
        const logs = await fetchLogs(selectedNetwork);
        if (logs.length > 0) {
          const devs = await fetchDeviations(selectedNetwork, logs[0].id);
          setDeviations(devs);
        } else {
          setDeviations([]);
        }
      } catch (e) {
        message.error('Не удалось загрузить отклонения');
      }
    };
    if (viewMode === 'deviations') {
      loadDeviations();
    }
  }, [selectedNetwork, viewMode]);

  useEffect(() => {
    setSelectedEdgeId(null);
  }, [selectedNetwork, viewMode]);

  const highlightStyles = useMemo(() => {
    const result: Record<number, { color?: string; width?: number; opacity?: number }> = {};
    deviations.forEach((dev) => {
      if (!dev.level) return;
      const meta = getSeverityMeta(dev.level);
      result[dev.edge_id] = {
        color: meta.color,
        width: dev.level === 1 ? 5 : 4,
        opacity: dev.level === 1 ? 0.9 : 0.8,
      };
    });
    return result;
  }, [deviations]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const date = dayjs(ev.created_at);
      const [from, to] = dateRange;
      const withinFrom = from ? date.isAfter(from) || date.isSame(from) : true;
      const withinTo = to ? date.isBefore(to) || date.isSame(to) : true;
      return withinFrom && withinTo;
    });
  }, [events, dateRange]);

  const eventCounts = useMemo(() => {
    const total = filteredEvents.length;
    const levelCounts = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    filteredEvents.forEach((ev) => {
      const lvl = ev.msg?.level as 1 | 2 | 3 | undefined;
      if (lvl && levelCounts[lvl] !== undefined) levelCounts[lvl] += 1;
    });
    return { total, levelCounts };
  }, [filteredEvents]);

  const deviationCounts = useMemo(() => {
    const levelCounts = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    deviations.forEach((dev) => {
      if (dev.level === 1 || dev.level === 2 || dev.level === 3) levelCounts[dev.level] += 1;
    });
    const total = deviations.length;
    return { total, levelCounts };
  }, [deviations]);

  const topEvents = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .filter((ev) => ev.msg?.level)
      .slice(0, 5);
  }, [filteredEvents]);

  const topDeviations = useMemo(() => {
    return [...deviations]
      .filter((d) => d.level != null)
      .sort((a, b) => {
        const levelWeight = (lvl?: number | null) => (lvl === 1 ? 3 : lvl === 2 ? 2 : lvl === 3 ? 1 : 0);
        const diff = (val?: number | null, ref?: number | null) =>
          val != null && ref != null ? Math.abs(val - ref) : 0;
        const levelCompare = levelWeight(b.level) - levelWeight(a.level);
        if (levelCompare !== 0) return levelCompare;
        return diff(b.value, b.reference) - diff(a.value, a.reference);
      })
      .slice(0, 5);
  }, [deviations]);

  const subsystemAggregation = useMemo(() => {
    if (viewMode === 'events') {
      const map = new Map<string, number>();
      filteredEvents.forEach((ev) => {
        const lvl = ev.msg?.level;
        if (lvl !== 1) return;
        const networkName = networks.find((network) => network.id === ev.msg?.network_id)?.name;
        const key = ev.msg?.subsystem || networkName || ev.msg?.network_id || 'Неизвестно';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return Array.from(map.entries());
    }
    const map = new Map<string, number>();
    deviations.forEach((dev) => {
      if (dev.level !== 1) return;
      const key = formatEdgeShortLabel(dev.edge_id);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [filteredEvents, deviations, networks, viewMode]);

  return (
    <div className="page-shell">
      <Row gutter={16} align="middle" className="dashboard-header">
        <Col span={12}>
          <Typography.Title level={3} className="page-title">
            Дашборд мэра
          </Typography.Title>
          <Typography.Paragraph>
            Общая картина рисков по подсистемам города и «горячие точки».
          </Typography.Paragraph>
        </Col>
        <Col span={12} className="dashboard-filters">
          <Space wrap>
            <Segmented
              value={viewMode}
              onChange={(val) => setViewMode(val as 'deviations' | 'events')}
              options={[
                { label: 'Отклонения', value: 'deviations' },
                { label: 'События', value: 'events' },
              ]}
            />
            <RangePicker value={dateRange} onChange={(v) => setDateRange(v as any)} />
            <Select
              placeholder="Уровень"
              allowClear
              value={level ?? undefined}
              onChange={(val) => setLevel((val as 1 | 2 | 3 | undefined) ?? null)}
              options={[1, 2, 3].map((lvl) => ({ value: lvl, label: getSeverityMeta(lvl as 1 | 2 | 3).tagText }))}
              style={{ width: 160 }}
            />
            <Select
              placeholder="Сеть"
              value={selectedNetwork}
              onChange={(v) => setSelectedNetwork(v)}
              options={networks.map((n) => ({ value: n.id, label: n.name }))}
              style={{ width: 220 }}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title={viewMode === 'events' ? 'Всего событий' : 'Всего отклонений'}
              value={viewMode === 'events' ? eventCounts.total : deviationCounts.total}
              loading={loading && viewMode === 'events'}
            />
          </Card>
        </Col>
        {[1, 2, 3].map((lvl) => {
          const meta = getSeverityMeta(lvl as 1 | 2 | 3);
          return (
            <Col span={6} key={lvl}>
              <Card>
                <Statistic
                  title={meta.tagText}
                  value={
                    viewMode === 'events'
                      ? eventCounts.levelCounts[lvl as 1 | 2 | 3]
                      : deviationCounts.levelCounts[lvl as 1 | 2 | 3]
                  }
                  loading={loading && viewMode === 'events'}
                />
              </Card>
            </Col>
          );
        })}
      </Row>

      <Row gutter={16} className="page-section">
        <Col span={12}>
          <Card title={viewMode === 'events' ? 'Основные события' : 'Основные отклонения'}>
            {viewMode === 'events' ? (
              <List
                dataSource={topEvents}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Typography.Text strong>{dayjs(item.created_at).format('DD.MM HH:mm')}</Typography.Text>
                        <LevelTag level={item.msg?.level} />
                      </Space>
                      <Typography.Text>
                        {item.msg?.description || item.msg?.title || JSON.stringify(item.msg).slice(0, 160)}
                      </Typography.Text>
                      {item.msg?.regulation && (
                        <Typography.Text type="secondary">Регламент: {item.msg.regulation}</Typography.Text>
                      )}
                      {item.msg?.recommendation && (
                        <Typography.Text type="secondary">Рекомендация: {item.msg.recommendation}</Typography.Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <List
                dataSource={topDeviations}
                renderItem={(item) => (
                  <List.Item onClick={() => setSelectedEdgeId(item.edge_id)} style={{ cursor: 'pointer' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Tag color={getSeverityMeta(item.level as any).color}>
                          {getSeverityMeta(item.level as any).tagText}
                        </Tag>
                        <Typography.Text strong>{formatEdgeShortLabel(item.edge_id)}</Typography.Text>
                      </Space>
                      <Typography.Text>
                        Параметр: {getDeviationTypeLabel(item.type)} | Факт: {item.value ?? '—'} | Норма:{' '}
                        {item.reference ?? '—'}
                      </Typography.Text>
                      {item.regulation && (
                        <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                          Регламент: {item.regulation}
                        </Typography.Text>
                      )}
                      {item.recommendation && (
                        <Typography.Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>
                          Рекомендация: {item.recommendation}
                        </Typography.Text>
                      )}
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card
            title={
              viewMode === 'events' ? 'Критичные события по подсистемам' : 'Критичные отклонения по участкам'
            }
          >
            <List
              dataSource={subsystemAggregation}
              renderItem={([key, value]) => (
                <List.Item>
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Typography.Text>{key}</Typography.Text>
                    <Tag color="red">{value}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {viewMode === 'deviations' ? (
        <div className="page-section">
          <Card title="Карта горячих точек">
            {selectedNetwork ? (
              <div>
                <YandexTopologyMap
                  networkId={selectedNetwork}
                  height={380}
                  highlightEdges={highlightStyles}
                  selectedEdgeId={selectedEdgeId}
                  onEdgeSelect={setSelectedEdgeId}
                />
                <Typography.Paragraph style={{ marginTop: 12 }}>
                  На карте отображена топология теплосети. Красным подсвечены участки с критичными отклонениями
                  (уровень 1), остальные линии показывают уровень согласно журналу отклонений.
                </Typography.Paragraph>
              </div>
            ) : (
              <Typography.Text>Выберите сеть, чтобы показать карту.</Typography.Text>
            )}
          </Card>
        </div>
      ) : (
        <div className="page-section">
          <Card title="Карта недоступна в режиме «События»">
            <Typography.Paragraph type="secondary">
              Переключитесь на режим «Отклонения», чтобы увидеть топологию и горячие точки сети.
            </Typography.Paragraph>
          </Card>
        </div>
      )}
    </div>
  );
}

export default MayorDashboardPage;
