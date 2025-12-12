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
import { fetchEvents } from '../api/client';
import { EventResponse } from '../api/types';

const { RangePicker } = DatePicker;

function OperatorDashboardPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<1 | 2 | 3 | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [skip, setSkip] = useState(0);
  const [limit] = useState(10);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const loadEvents = () => {
    setLoading(true);
    fetchEvents({ limit, skip, level: level ?? undefined, order: 'desc' })
      .then(setEvents)
      .catch(() => message.error('Ошибка при загрузке событий'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadEvents();
  }, [skip, level]);

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
    <div>
      <Typography.Title level={3}>Дашборд оператора</Typography.Title>
      <Typography.Paragraph>
        Лента событий, фильтры и детальная карточка для быстрого реагирования.
      </Typography.Paragraph>

      <Space style={{ marginBottom: 16 }}>
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
            <Typography.Text>Описание: {selectedEvent.msg?.description || selectedEvent.msg?.title}</Typography.Text>
            {selectedEvent.msg?.regulation && (
              <Typography.Text>Применённый регламент: {selectedEvent.msg.regulation}</Typography.Text>
            )}
            {selectedEvent.msg?.recommendation && (
              <Typography.Text>Рекомендованное действие: {selectedEvent.msg.recommendation}</Typography.Text>
            )}
            <Card size="small" title="Детали события">
              <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(selectedEvent.msg, null, 2)}</pre>
            </Card>
            <Typography.Paragraph type="secondary">
              Если событие привязано к узлу или ребру (network_id/node_id/edge_id), оператор может подсветить
              его на топологии, используя компонент из вкладки «Данные и топология».
            </Typography.Paragraph>
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default OperatorDashboardPage;
