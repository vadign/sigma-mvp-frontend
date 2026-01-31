import { useMemo } from 'react';
import { Button, Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDemoData } from '../demo/demoState';
import {
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
      return <Tag color="green">{status}</Tag>;
    case 'Не получает данные':
      return <Tag color="gold">{status}</Tag>;
    case 'Приостановлен':
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

function CabinetPage() {
  const navigate = useNavigate();

  const { agents, events } = useDemoData();

  const agentRows = useMemo<AgentRow[]>(() => {
    return agents.map((agent) => {
      const scopedEvents = filterEventsByAgent(events, agent.id);
      const attentionCount = scopedEvents.filter(isEventAttention).length;
      const lastEventAt = getLastEventAt(scopedEvents);
      const minutesAgo = lastEventAt ? dayjs().diff(lastEventAt, 'minute') : null;
      const isStale = minutesAgo == null || minutesAgo > STALE_DATA_THRESHOLD_MINUTES;
      const status: AgentRow['status'] = agent.isPaused
        ? 'Приостановлен'
        : isStale
          ? 'Не получает данные'
          : 'Активен';
      const updatedAtLabel = lastEventAt ? `${minutesAgo ?? 0} мин назад` : '—';
      const updatedAtTooltip = isStale
        ? `Нет новых данных более ${STALE_DATA_THRESHOLD_MINUTES} минут`
        : undefined;

      return {
        id: agent.id,
        title: agent.name,
        responsibility: agent.responsibilityZone,
        attentionCount,
        status,
        updatedAtLabel,
        updatedAtTooltip,
      };
    })
      .sort((a, b) => b.attentionCount - a.attentionCount);
  }, [agents, events]);

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
