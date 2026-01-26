import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { fetchEvents } from '../api/client';
import { EventResponse } from '../api/types';
import {
  AGENTS,
  AgentId,
  STALE_DATA_THRESHOLD_MINUTES,
  filterEventsByAgent,
  getLastEventAt,
  isEventAttention,
} from '../utils/agents';

interface AgentRow {
  id: AgentId;
  title: string;
  responsibility: string;
  attentionCount: number;
  status: 'Активен' | 'Не получает данные' | 'Приостановлен';
  updatedAtLabel: string;
  updatedAtTooltip?: string;
}

const resolveStatusBadge = (status: AgentRow['status']) => {
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

function CabinetPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    fetchEvents({ limit: 200, order: 'desc' })
      .then(setEvents)
      .catch(() => message.error('Не удалось загрузить события'))
      .finally(() => setLoading(false));
  }, []);

  const agentRows = useMemo<AgentRow[]>(() => {
    return AGENTS.map((agent) => {
      const scopedEvents = filterEventsByAgent(events, agent.id);
      const attentionCount = scopedEvents.filter(isEventAttention).length;
      const lastEventAt = getLastEventAt(scopedEvents);
      const minutesAgo = lastEventAt ? dayjs().diff(lastEventAt, 'minute') : null;
      const isStale = minutesAgo == null || minutesAgo > STALE_DATA_THRESHOLD_MINUTES;
      const status: AgentRow['status'] = agent.paused
        ? 'Приостановлен'
        : isStale
          ? 'Не получает данные'
          : 'Активен';
      const updatedAtLabel = lastEventAt
        ? `${lastEventAt.format('DD.MM.YYYY HH:mm')} · ${minutesAgo ?? 0} мин назад`
        : '—';
      const updatedAtTooltip = isStale
        ? `Нет новых данных более ${STALE_DATA_THRESHOLD_MINUTES} минут`
        : undefined;

      return {
        id: agent.id,
        title: agent.title,
        responsibility: agent.responsibility,
        attentionCount,
        status,
        updatedAtLabel,
        updatedAtTooltip,
      };
    })
      .sort((a, b) => b.attentionCount - a.attentionCount);
  }, [events]);

  const columns: ColumnsType<AgentRow> = [
    {
      title: 'Заместитель',
      dataIndex: 'title',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Зона ответственности',
      dataIndex: 'responsibility',
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Требуют внимания',
      dataIndex: 'attentionCount',
      align: 'center',
      render: (value: number) => (
        <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>
      ),
      sorter: (a, b) => a.attentionCount - b.attentionCount,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (_: string, record) =>
        record.updatedAtTooltip ? (
          <Tooltip title={record.updatedAtTooltip}>{resolveStatusBadge(record.status)}</Tooltip>
        ) : (
          resolveStatusBadge(record.status)
        ),
    },
    {
      title: 'Последние данные',
      dataIndex: 'updatedAtLabel',
      render: (_: string, record) => (
        <Typography.Text type={record.updatedAtLabel === '—' ? 'secondary' : undefined}>
          {record.updatedAtLabel}
        </Typography.Text>
      ),
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_: unknown, record) => (
        <Button type="link" onClick={() => navigate(`/cabinet/${record.id}`)}>
          Открыть
        </Button>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <div>
        <Typography.Title level={3} className="page-title">
          Личный кабинет
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          Реестр цифровых заместителей по ключевым направлениям с актуальным статусом и числом событий.
        </Typography.Paragraph>
      </div>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Table
            rowKey="id"
            dataSource={agentRows}
            columns={columns}
            loading={loading}
            pagination={false}
          />
          <Typography.Text type="secondary">
            Сортировка по числу событий, требующих внимания, в порядке убывания.
          </Typography.Text>
        </Space>
      </Card>
    </div>
  );
}

export default CabinetPage;
