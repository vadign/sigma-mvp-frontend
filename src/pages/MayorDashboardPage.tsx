import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  fetchDeviations,
  fetchEvents,
  fetchLogs,
  fetchNetworks,
  fetchTopology,
} from '../api/client';
import { DeviationGetResponse, EventResponse, NetworkResponse, TopologyGetResponse } from '../api/types';
import { getSeverityMeta } from '../utils/severity';

const { RangePicker } = DatePicker;

declare const ymaps: any;

function mercatorToLatLng(x?: number | null, y?: number | null) {
  if (x == null || y == null) return null;
  const lon = (x / 20037508.34) * 180;
  const lat = (y / 20037508.34) * 180;
  const latRadians = (Math.PI / 180) * lat;
  const latDeg = (180 / Math.PI) * (2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);
  return [latDeg, lon] as [number, number];
}

function MayorDashboardPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<string | undefined>();
  const [topology, setTopology] = useState<TopologyGetResponse | null>(null);
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<'deviations' | 'events'>('deviations');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const edgeObjectsRef = useRef<Map<number, any>>(new Map());
  const nodesCollectionRef = useRef<any>(null);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setSelectedNetwork(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  useEffect(() => {
    if (typeof ymaps !== 'undefined') {
      ymaps.ready(() => setMapReady(true));
    }
  }, []);

  useEffect(() => () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.destroy();
      mapInstanceRef.current = null;
    }
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
    const loadTopologyAndDeviations = async () => {
      if (!selectedNetwork) return;
      try {
        const topo = await fetchTopology(selectedNetwork);
        setTopology(topo);
        const logs = await fetchLogs(selectedNetwork);
        if (logs.length > 0) {
          const lastLog = logs[0];
          const devs = await fetchDeviations(selectedNetwork, lastLog.id);
          setDeviations(devs);
        } else {
          setDeviations([]);
        }
      } catch (e) {
        message.error('Не удалось загрузить топологию/отклонения');
      }
    };
    loadTopologyAndDeviations();
  }, [selectedNetwork]);

  useEffect(() => {
    if (!mapReady || !topology || viewMode !== 'deviations') return;
    const hotEdgeSet = new Set(deviations.filter((d) => d.level === 1).map((d) => d.edge_id));
    renderTopologyOnMap(topology, hotEdgeSet);
  }, [mapReady, topology, deviations, viewMode]);

  const renderTopologyOnMap = (data: TopologyGetResponse, hotEdges: Set<number>) => {
    if (!mapContainerRef.current) return;

    const nodes = data.nodes.filter((n) => n.WTK_x != null && n.WTK_y != null);
    if (!mapInstanceRef.current) {
      const centerCoords = nodes.length ? mercatorToLatLng(nodes[0].WTK_x, nodes[0].WTK_y) : [55.75, 37.61];
      mapInstanceRef.current = new ymaps.Map(mapContainerRef.current, {
        center: centerCoords,
        zoom: 12,
        controls: ['zoomControl', 'fullscreenControl', 'typeSelector'],
      });
    }

    const map = mapInstanceRef.current;
    map.geoObjects.removeAll();
    edgeObjectsRef.current.clear();
    nodesCollectionRef.current = new ymaps.GeoObjectCollection();

    const edgeObjects = new ymaps.GeoObjectCollection();

    data.edges.forEach((edge) => {
      const fromNode = data.nodes.find((n) => n.id === edge.id_in);
      const toNode = data.nodes.find((n) => n.id === edge.id_out);
      const fromCoords = mercatorToLatLng(fromNode?.WTK_x, fromNode?.WTK_y);
      const toCoords = mercatorToLatLng(toNode?.WTK_x, toNode?.WTK_y);

      if (!fromCoords || !toCoords) return;

      const isHot = hotEdges.has(edge.id);
      const line = new ymaps.Polyline(
        [fromCoords, toCoords],
        {},
        {
          strokeColor: isHot ? '#ff4d4f' : '#4a90e2',
          strokeWidth: isHot ? 5 : 3,
          strokeOpacity: isHot ? 0.9 : 0.7,
          hintContent: `Ребро ${edge.id}`,
        },
      );
      edgeObjects.add(line);
      edgeObjectsRef.current.set(edge.id, line);
    });

    nodes.forEach((node) => {
      const coords = mercatorToLatLng(node.WTK_x, node.WTK_y);
      if (!coords) return;
      const isHotNode = data.edges.some(
        (edge) => hotEdges.has(edge.id) && (edge.id_in === node.id || edge.id_out === node.id),
      );
      const placemark = new ymaps.Placemark(
        coords,
        {
          balloonContent: `УЗ-${node.id}`,
        },
        {
          preset: 'islands#circleIcon',
          iconColor: isHotNode ? '#ff4d4f' : '#1677ff',
          iconCaption: `УЗ-${node.id}`,
        },
      );
      nodesCollectionRef.current.add(placemark);
    });

    map.geoObjects.add(edgeObjects);
    map.geoObjects.add(nodesCollectionRef.current);

    if (nodesCollectionRef.current.getLength() > 0) {
      const bounds = nodesCollectionRef.current.getBounds();
      if (bounds) {
        map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
      }
    }
  };

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
        const key = ev.msg?.subsystem || ev.msg?.network_id || 'Неизвестно';
        map.set(key, (map.get(key) || 0) + 1);
      });
      return Array.from(map.entries());
    }
    const map = new Map<string, number>();
    deviations.forEach((dev) => {
      if (dev.level !== 1) return;
      const key = String(dev.edge_id);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [filteredEvents, deviations, viewMode]);

  return (
    <div>
      <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
        <Col span={12}>
          <Typography.Title level={3}>Дашборд мэра</Typography.Title>
          <Typography.Paragraph>
            Общая картина рисков по подсистемам города и «горячие точки».
          </Typography.Paragraph>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
          <Space>
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
                  <List.Item>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        <Tag color={getSeverityMeta(item.level as any).color}>
                          {getSeverityMeta(item.level as any).tagText}
                        </Tag>
                        <Typography.Text strong>Ребро {item.edge_id}</Typography.Text>
                      </Space>
                      <Typography.Text>
                        Параметр: {item.type} | Факт: {item.value ?? '—'} | Норма: {item.reference ?? '—'}
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
          <Card title={viewMode === 'events' ? 'Критичные события по подсистемам' : 'Критичные отклонения по рёбрам'}>
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
            {topology ? (
              <div>
                <div
                  id="mayorMap"
                  ref={mapContainerRef}
                  style={{ height: 380, width: '100%', borderRadius: 8, overflow: 'hidden' }}
                />
                <Typography.Paragraph style={{ marginTop: 12 }}>
                  На карте отображена топология теплосети. Красным подсвечены участки с критичными отклонениями
                  (уровень 1), остальная сеть показывается спокойным синим цветом.
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
