import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Empty, Row, Space, Statistic, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import EventsTable from '../components/EventsTable';
import { fetchEvents } from '../api/client';
import { EventResponse } from '../api/types';
import {
  AGENTS,
  AgentDefinition,
  AgentId,
  STALE_DATA_THRESHOLD_MINUTES,
  filterEventsByAgent,
  getLastEventAt,
  isEventAttention,
} from '../utils/agents';
import { getSeverityMeta } from '../utils/severity';

interface TaskRow {
  key: string;
  title: string;
  dueAt: string;
  status: string;
  owner: string;
}

const TASK_COLUMNS: ColumnsType<TaskRow> = [
  { title: 'Решение / поручение', dataIndex: 'title' },
  { title: 'Срок', dataIndex: 'dueAt' },
  { title: 'Статус', dataIndex: 'status' },
  { title: 'Исполнитель', dataIndex: 'owner' },
];

const resolveAgent = (agentId?: string): AgentDefinition | null =>
  AGENTS.find((agent) => agent.id === agentId) ?? null;

const resolveStatusBadge = (status: 'Активен' | 'Не получает данные' | 'Приостановлен') => {
  switch (status) {
    case 'Активен':
      return <Badge status="success" text={status} />;
    case 'Не получает данные':
      return <Badge status="warning" text={status} />;
    case 'Приостановлен':
    default:
      return <Badge status="default" text={status} />;
  }
};

function AgentPage() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const agent = resolveAgent(agentId);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEvents({ limit: 200, order: 'desc' })
      .then(setEvents)
      .catch(() => message.error('Не удалось загрузить события'))
      .finally(() => setLoading(false));
  }, []);

  const scopedEvents = useMemo(() => {
    if (!agent) return [];
    return filterEventsByAgent(events, agent.id);
  }, [agent, events]);

  const attentionEvents = useMemo(() => scopedEvents.filter(isEventAttention), [scopedEvents]);

  const kpi = useMemo(() => {
    const active = scopedEvents.length;
    const critical = scopedEvents.filter((event) => event.msg?.level === 1).length;
    const attention = attentionEvents.length;
    return { active, critical, attention };
  }, [scopedEvents, attentionEvents]);

  const statusLabel = useMemo(() => {
    if (!agent) return 'Приостановлен';
    if (agent.paused) return 'Приостановлен';
    const lastEventAt = getLastEventAt(scopedEvents);
    const minutesAgo = lastEventAt ? dayjs().diff(lastEventAt, 'minute') : null;
    const isStale = minutesAgo == null || minutesAgo > STALE_DATA_THRESHOLD_MINUTES;
    return isStale ? 'Не получает данные' : 'Активен';
  }, [agent, scopedEvents]);

  if (!agent) {
    return (
      <div className="page-shell">
        <Typography.Title level={3} className="page-title">
          Заместитель не найден
        </Typography.Title>
        <Typography.Paragraph>
          Проверьте выбранный раздел или вернитесь в личный кабинет.
        </Typography.Paragraph>
        <Tag color="blue" style={{ cursor: 'pointer', width: 'fit-content' }} onClick={() => navigate('/cabinet')}>
          Перейти в личный кабинет
        </Tag>
      </div>
    );
  }

  const lastEventAt = getLastEventAt(scopedEvents);
  const updatedLabel = lastEventAt ? lastEventAt.format('DD.MM.YYYY HH:mm') : '—';

  return (
    <div className="page-shell">
      <div>
        <Space align="center">
          <Typography.Title level={3} className="page-title">
            {agent.title}
          </Typography.Title>
          {resolveStatusBadge(statusLabel)}
        </Space>
        <Typography.Paragraph type="secondary">
          {agent.responsibility} · Последние данные: {updatedLabel}
        </Typography.Paragraph>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Активные инциденты" value={kpi.active} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Критичные инциденты"
              value={kpi.critical}
              valueStyle={{ color: getSeverityMeta(1).color }}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Требуют вмешательства" value={kpi.attention} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Среднее время реакции" value="—" />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="registry"
        items={[
          {
            key: 'registry',
            label: 'Реестр событий',
            children: (
              <Card>
                <EventsTable events={scopedEvents} loading={loading} />
              </Card>
            ),
          },
          {
            key: 'actions',
            label: 'Журнал действий заместителя',
            children: (
              <Card>
                <Empty description="Будет доступно в следующей версии" />
              </Card>
            ),
          },
          {
            key: 'tasks',
            label: 'Решения и поручения',
            children: (
              <Card>
                <Table columns={TASK_COLUMNS} dataSource={[]} pagination={false} locale={{ emptyText: 'Нет данных' }} />
              </Card>
            ),
          },
          {
            key: 'attention',
            label: 'Требуют вмешательства',
            children: (
              <Card>
                {attentionEvents.length > 0 ? (
                  <EventsTable events={attentionEvents} loading={loading} />
                ) : (
                  <Empty description="Нет событий, требующих внимания" />
                )}
              </Card>
            ),
          },
          {
            key: 'dynamics',
            label: 'Динамика и проблемные зоны',
            children: (
              <Card>
                <Empty description="Графики и тренды появятся в следующей версии" />
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

export default AgentPage;
