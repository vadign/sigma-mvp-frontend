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
    setLoading(true);
    fetchEvents({ limit: 100, order: 'desc', level: level ?? undefined })
      .then(setEvents)
      .catch(() => message.error('Ошибка загрузки событий'))
      .finally(() => setLoading(false));
  }, [level]);

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
    if (!mapReady || !topology) return;
    const hotEdgeSet = new Set(deviations.filter((d) => d.level === 3).map((d) => d.edge_id));
    renderTopologyOnMap(topology, hotEdgeSet);
  }, [mapReady, topology, deviations]);

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
          balloonContent: `Узел ${node.id}<br/>WTK_x: ${node.WTK_x}<br/>WTK_y: ${node.WTK_y}`,
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

  const counts = useMemo(() => {
    const total = filteredEvents.length;
    const levelCounts = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    filteredEvents.forEach((ev) => {
      const lvl = ev.msg?.level as 1 | 2 | 3 | undefined;
      if (lvl && levelCounts[lvl] !== undefined) levelCounts[lvl] += 1;
    });
    return { total, levelCounts };
  }, [filteredEvents]);

  const topProblems = useMemo(() => {
    return [...filteredEvents]
      .sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
      .filter((ev) => ev.msg?.level)
      .slice(0, 5);
  }, [filteredEvents]);

  const subsystemAggregation = useMemo(() => {
    const map = new Map<string, number>();
    filteredEvents.forEach((ev) => {
      const lvl = ev.msg?.level;
      if (lvl !== 3) return;
      const key = ev.msg?.subsystem || ev.msg?.network_id || 'Неизвестно';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [filteredEvents]);

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
            <RangePicker value={dateRange} onChange={(v) => setDateRange(v as any)} />
            <Select
              placeholder="Уровень"
              allowClear
              value={level ?? undefined}
              onChange={(val) => setLevel((val as 1 | 2 | 3 | undefined) ?? null)}
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
              ]}
              style={{ width: 120 }}
            />
            <Select
              placeholder="Сеть"
              value={selectedNetwork}
              onChange={(v) => setSelectedNetwork(v)}
              options={networks.map((n) => ({ value: n.id, label: n.name }))}
              style={{ width: 200 }}
            />
          </Space>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="Всего событий" value={counts.total} loading={loading} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Критичные (3)" value={counts.levelCounts[3]} loading={loading} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Серьёзные (2)" value={counts.levelCounts[2]} loading={loading} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Внимание (1)" value={counts.levelCounts[1]} loading={loading} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} className="page-section">
        <Col span={12}>
          <Card title="Основные проблемы дня">
            <List
              dataSource={topProblems}
              renderItem={(item) => (
                <List.Item>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Space>
                      <Typography.Text strong>
                        {dayjs(item.created_at).format('DD.MM HH:mm')}
                      </Typography.Text>
                      <LevelTag level={item.msg?.level} />
                    </Space>
                    <Typography.Text>{item.msg?.description || item.msg?.title}</Typography.Text>
                    {item.msg?.regulation && (
                      <Typography.Text type="secondary">
                        Регламент: {item.msg.regulation}
                      </Typography.Text>
                    )}
                    {item.msg?.recommendation && (
                      <Typography.Text type="secondary">
                        Рекомендация: {item.msg.recommendation}
                      </Typography.Text>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Критичные события по подсистемам">
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
                На карте отображена топология теплосети. Красным подсвечены участки с критичными
                отклонениями (уровень 3), остальная сеть показывается спокойным синим цветом.
              </Typography.Paragraph>
            </div>
          ) : (
            <Typography.Text>Выберите сеть, чтобы показать карту.</Typography.Text>
          )}
        </Card>
      </div>
    </div>
  );
}

export default MayorDashboardPage;
