import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import EventsTable from '../components/EventsTable';
import LevelTag from '../components/LevelTag';
import EventSummary from '../components/EventSummary';
import { fetchEvents, fetchNetworks } from '../api/client';
import { EventResponse, NetworkResponse } from '../api/types';
import { YandexTopologyMap } from '../components/maps/YandexTopologyMap';

const { RangePicker } = DatePicker;

function OperatorDashboardPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  const loadEvents = () => {
    setLoading(true);
    fetchEvents({ limit, skip, level: level ?? undefined, order: 'desc' })
      .then(setEvents)
      .catch(() => message.error('Ошибка при загрузке событий'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setSelectedNetworkId(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [skip, level]);

  useEffect(() => {
    if (selectedEvent?.msg) {
      const edgeId = selectedEvent.msg.edge_id;
      setSelectedEdgeId(typeof edgeId === 'number' ? edgeId : null);
      if (typeof selectedEvent.msg.network_id === 'string') {
        setSelectedNetworkId(selectedEvent.msg.network_id);
      }
    } else {
      setSelectedEdgeId(null);
    }
  }, [selectedEvent]);

  useEffect(() => {
    setSelectedEdgeId(null);
  }, [selectedNetworkId]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const date = dayjs(ev.created_at);
      const [from, to] = dateRange;
      const withinFrom = from ? date.isAfter(from) || date.isSame(from) : true;
      const withinTo = to ? date.isBefore(to) || date.isSame(to) : true;
      return withinFrom && withinTo;
    });
  }, [events, dateRange]);

  const changePage = (direction: 'prev' | 'next') => {
    setSkip((prev) => Math.max(0, prev + (direction === 'next' ? limit : -limit)));
  };

  return (
    <div className="page-shell">
      <Typography.Title level={3} className="page-title">
        Дашборд оператора
      </Typography.Title>
      <Typography.Paragraph>
        Лента событий, фильтры и детальная карточка для быстрого реагирования.
      </Typography.Paragraph>

      <Space className="filter-bar" wrap>
        <RangePicker value={dateRange} onChange={(v) => setDateRange(v as any)} />
        <Select
          placeholder="Уровень"
          allowClear
          style={{ width: 140 }}
          value={level ?? undefined}
          onChange={(v) => setLevel((v as 1 | 2 | 3 | undefined) ?? null)}
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
          ]}
        />
        <Select
          placeholder="Сеть для карты"
          allowClear
          style={{ width: 200 }}
          value={selectedNetworkId ?? undefined}
          onChange={(v) => setSelectedNetworkId(v ?? null)}
          options={networks.map((n) => ({ value: n.id, label: n.name }))}
        />
        <Button onClick={loadEvents}>Обновить</Button>
      </Space>

      <Card>
        <EventsTable events={filteredEvents} loading={loading} onRowClick={(ev) => setSelectedEvent(ev)} />
        <Space style={{ marginTop: 12 }}>
          <Button disabled={skip === 0} onClick={() => changePage('prev')}>
            Назад
          </Button>
          <Button onClick={() => changePage('next')}>Вперёд</Button>
          <Typography.Text type="secondary">Показано {filteredEvents.length} записей</Typography.Text>
        </Space>
      </Card>

      <Card className="page-section" title="Карта топологии">
        {selectedNetworkId ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <YandexTopologyMap
              networkId={selectedNetworkId}
              height={360}
              selectedEdgeId={selectedEdgeId}
              onEdgeSelect={setSelectedEdgeId}
            />
            <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
              Выделите событие с указанием участка трубы, чтобы подсветить его на карте, или нажмите на линию,
              чтобы увидеть показатели.
            </Typography.Paragraph>
          </Space>
        ) : (
          <Typography.Text>Загрузка списка сетей...</Typography.Text>
        )}
      </Card>

      <Drawer
        title="Карточка события"
        open={!!selectedEvent}
        width={520}
        onClose={() => setSelectedEvent(null)}
      >
        {selectedEvent && (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Typography.Text>
              Время: {dayjs(selectedEvent.created_at).format('DD.MM.YYYY HH:mm:ss')}
            </Typography.Text>
            <LevelTag level={selectedEvent.msg?.level} />
            <EventSummary msg={selectedEvent.msg} networks={networks} showLevel={false} />
            <Typography.Paragraph type="secondary">
              Если событие привязано к сети, узлу или участку, оператор может подсветить его на топологии,
              используя интерактивную карту.
            </Typography.Paragraph>
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default OperatorDashboardPage;
