import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, Col, Empty, Row, Select, Spin, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  DeviationGetResponse,
  LogsGetResponse,
  NetworkResponse,
  TopologyGetResponse,
} from '../api/types';
import { fetchDeviations, fetchLogs, fetchNetworks, fetchTopology } from '../api/client';
import { getSeverityMeta, SeverityLevel } from '../utils/severity';

declare const ymaps: any;

function mercatorToLatLon(x: number, y: number) {
  const R_MAJOR = 6378137.0;
  const lon = (x / R_MAJOR) * (180 / Math.PI);
  const lat = (2 * Math.atan(Math.exp(y / R_MAJOR)) - Math.PI / 2) * (180 / Math.PI);
  return { lat, lon };
}

type TopologyEdgeMap = Map<number, any>;

function DataAndTopologyPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [topology, setTopology] = useState<TopologyGetResponse | null>(null);
  const [logs, setLogs] = useState<LogsGetResponse[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [loadingTopology, setLoadingTopology] = useState(false);
  const [loadingDeviations, setLoadingDeviations] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const edgeObjectsRef = useRef<TopologyEdgeMap>(new Map());
  const nodesCollectionRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setLoadingNetworks(true);
    fetchNetworks()
      .then((data) => {
        setNetworks(data);
        if (data.length > 0) setSelectedNetworkId(data[0].id);
      })
      .catch(() => message.error('Не удалось загрузить список сетей'))
      .finally(() => setLoadingNetworks(false));
  }, []);

  useEffect(() => {
    if (typeof ymaps !== 'undefined') {
      ymaps.ready(() => setMapReady(true));
    }
  }, []);

  useEffect(() => {
    if (!selectedNetworkId) return;
    setLoadingTopology(true);
    Promise.all([fetchTopology(selectedNetworkId), fetchLogs(selectedNetworkId)])
      .then(([topo, logList]) => {
        setTopology(topo);
        const sortedLogs = [...logList].sort(
          (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf(),
        );
        setLogs(sortedLogs);
        if (sortedLogs.length > 0) setSelectedLogId(sortedLogs[0].id);
        else {
          setSelectedLogId(null);
          setDeviations([]);
        }
      })
      .catch(() => message.error('Ошибка при загрузке топологии и журналов'))
      .finally(() => setLoadingTopology(false));
  }, [selectedNetworkId]);

  useEffect(() => {
    if (!selectedNetworkId || selectedLogId == null) return;
    setLoadingDeviations(true);
    fetchDeviations(selectedNetworkId, selectedLogId)
      .then(setDeviations)
      .catch(() => message.error('Не удалось загрузить отклонения'))
      .finally(() => setLoadingDeviations(false));
  }, [selectedLogId, selectedNetworkId]);

  const validCoordinates = useMemo(() => {
    if (!topology) return [] as { lat: number; lon: number }[];
    return topology.nodes
      .filter((n) => n.WTK_x != null && n.WTK_y != null)
      .map((n) => mercatorToLatLon(n.WTK_x as number, n.WTK_y as number));
  }, [topology]);

  const highlightedEdges = useMemo(() => {
    const edgeLevels = new Map<number, DeviationGetResponse['level']>();
    deviations.forEach((dev) => {
      if (dev.level) edgeLevels.set(dev.edge_id, dev.level);
    });
    return edgeLevels;
  }, [deviations]);

  useEffect(() => {
    if (!mapReady || !topology) return;
    renderTopologyOnMap(topology, highlightedEdges);
  }, [mapReady, topology, highlightedEdges]);

  const renderTopologyOnMap = (data: TopologyGetResponse, edgeLevels: Map<number, number | null>) => {
    if (!mapContainerRef.current) return;

    const nodes = data.nodes.filter((n) => n.WTK_x != null && n.WTK_y != null);
    if (!mapInstanceRef.current) {
      const center = nodes.length
        ? mercatorToLatLon(nodes[0].WTK_x as number, nodes[0].WTK_y as number)
        : { lat: 55.751244, lon: 37.618423 };
      mapInstanceRef.current = new ymaps.Map(mapContainerRef.current, {
        center: [center.lat, center.lon],
        zoom: 12,
        controls: ['zoomControl', 'typeSelector', 'fullscreenControl'],
      });
    }

    const map = mapInstanceRef.current;
    map.geoObjects.removeAll();
    edgeObjectsRef.current.clear();
    nodesCollectionRef.current = new ymaps.GeoObjectCollection();

    data.edges.forEach((edge) => {
      const source = nodes.find((n) => n.id === edge.id_in);
      const target = nodes.find((n) => n.id === edge.id_out);
      if (!source || !target) return;
      const p1 = mercatorToLatLon(source.WTK_x as number, source.WTK_y as number);
      const p2 = mercatorToLatLon(target.WTK_x as number, target.WTK_y as number);
      const color = getEdgeColor(edgeLevels.get(edge.id));
      const polyline = new ymaps.Polyline(
        [
          [p1.lat, p1.lon],
          [p2.lat, p2.lon],
        ],
        {},
        {
          strokeColor: color,
          strokeWidth: 4,
          opacity: 0.8,
        },
      );
      map.geoObjects.add(polyline);
      edgeObjectsRef.current.set(edge.id, polyline);
    });

    nodes.forEach((node) => {
      const coords = mercatorToLatLon(node.WTK_x as number, node.WTK_y as number);
      const placemark = new ymaps.Placemark(
        [coords.lat, coords.lon],
        {
          balloonContent: `Узел ${node.id}<br/>WTK: ${node.WTK_x}, ${node.WTK_y}<br/>pos: ${node.pos_x}, ${node.pos_y}`,
          iconCaption: `УЗ-${node.id}`,
        },
        { preset: 'islands#blueDotIconWithCaption' },
      );
      nodesCollectionRef.current.add(placemark);
    });

    map.geoObjects.add(nodesCollectionRef.current);

    if (validCoordinates.length) {
      const lats = validCoordinates.map((c) => c.lat);
      const lons = validCoordinates.map((c) => c.lon);
      const bounds = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)],
      ];
      map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30 });
    }
  };

  const getEdgeColor = (level?: number | null) => getSeverityMeta(level as SeverityLevel).color;

  const deviationColumns: ColumnsType<DeviationGetResponse> = [
    { title: 'Ребро', dataIndex: 'edge_id', width: 90 },
    { title: 'Параметр', dataIndex: 'type', width: 120 },
    {
      title: 'Факт',
      dataIndex: 'value',
      render: (v: number | null | undefined) => (v ?? '—'),
    },
    {
      title: 'Норма',
      dataIndex: 'reference',
      render: (v: number | null | undefined) => (v ?? '—'),
    },
    {
      title: 'Уровень',
      dataIndex: 'level',
      width: 140,
      render: (lvl: DeviationGetResponse['level']) => {
        const meta = getSeverityMeta(lvl ?? undefined);
        return <Tag color={meta.color}>{meta.tagText}</Tag>;
      },
    },
    {
      title: 'Регламент',
      dataIndex: 'regulation',
      render: (text: string | null) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '—'}</div>
      ),
    },
    {
      title: 'Рекомендация',
      dataIndex: 'recommendation',
      render: (text: string | null) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '—'}</div>
      ),
    },
  ];

  const logColumns: ColumnsType<LogsGetResponse> = [
    {
      title: 'Дата и время',
      dataIndex: 'timestamp',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Действие',
      width: 140,
      render: (_, record) => (
        <a onClick={() => setSelectedLogId(record.id)} role="button">
          Показать отклонения
        </a>
      ),
    },
  ];

  return (
    <div className="page-section" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Typography.Title level={2} style={{ marginBottom: 8 }}>
        Топология и отклонения
      </Typography.Title>
      <section>
        <Typography.Title level={3}>Источник данных: теплосеть</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ maxWidth: 900 }}>
          Сигма подключается к цифровой модели теплосети и получает от неё данные в режиме, близком к
          реальному времени. Выберите сеть, чтобы увидеть её схему и журнал отклонений.
        </Typography.Paragraph>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Text strong>Выберите сеть</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <Select
                loading={loadingNetworks}
                placeholder="Сеть"
                value={selectedNetworkId ?? undefined}
                style={{ width: '100%' }}
                options={networks.map((n) => ({ label: n.name, value: n.id }))}
                onChange={(val) => setSelectedNetworkId(val)}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={16} lg={18}>
            <Typography.Paragraph>
              В пилотном примере Сигма работает с тепловой сетью города. Выше можно выбрать доступную сеть, далее
              показаны её карта и журнал отклонений.
            </Typography.Paragraph>
          </Col>
        </Row>
      </section>

      <section>
        <Typography.Title level={4}>Карта и топология теплосети</Typography.Title>
        <Typography.Paragraph>
          На карте отображается реальная схема сети: точки — узлы (колодцы, камеры, насосные), линии — участки
          трубопроводов. Сигма рассчитывает по ним отклонения и подсвечивает проблемные участки.
        </Typography.Paragraph>
        <Card bodyStyle={{ padding: 12 }}>
          {loadingTopology && <Spin tip="Топология загружается..." />}
          {!loadingTopology && (!topology || !validCoordinates.length) && (
            <Empty description="Топология недоступна или не содержит координат" />
          )}
          <div
            ref={mapContainerRef}
            id="topologyMap"
            style={{ height: 440, width: '100%', borderRadius: 8, overflow: 'hidden' }}
          />
        </Card>
        <Typography.Paragraph style={{ marginTop: 8 }} type="secondary">
          Каждая точка — узел теплосети. Линии подсвечиваются по уровню критичности отклонений: красный — высокий,
          оранжевый — средний, жёлтый — низкий. Если отклонений нет, линия отображается синим цветом.
        </Typography.Paragraph>
      </section>

      <section>
        <Typography.Title level={4}>Журнал отклонений</Typography.Title>
        <Typography.Paragraph>
          Сигма фиксирует отклонения параметров сети, присваивает им уровни критичности по цифровым регламентам и
          формирует рекомендации для диспетчерских служб.
        </Typography.Paragraph>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Card title="Записи журнала" size="small">
              <Table
                rowKey="id"
                size="small"
                columns={logColumns}
                dataSource={logs}
                pagination={false}
                onRow={(record) => ({
                  onClick: () => setSelectedLogId(record.id),
                  style: {
                    cursor: 'pointer',
                    background: selectedLogId === record.id ? '#e6f4ff' : undefined,
                  },
                })}
              />
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card
              title={selectedLogId ? `Отклонения журнала #${selectedLogId}` : 'Отклонения'}
              size="small"
            >
              <Table
                rowKey="id"
                size="small"
                loading={loadingDeviations}
                columns={deviationColumns}
                dataSource={deviations}
                pagination={{ pageSize: 6 }}
              />
            </Card>
          </Col>
        </Row>
        <Typography.Paragraph style={{ marginTop: 12 }} type="secondary">
          Цвет показывает уровень критичности отклонения. Регламенты задают пороги и правила, по которым система
          присваивает уровни и формирует рекомендации для диспетчерских служб.
        </Typography.Paragraph>
      </section>
    </div>
  );
}

export default DataAndTopologyPage;

