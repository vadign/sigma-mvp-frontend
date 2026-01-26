import { useMemo, useState } from 'react';
import { Badge, Card, Col, Empty, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import DemoControlPanel from '../components/DemoControlPanel';
import EventsTable from '../components/EventsTable';
import { DemoActionLogEntry, DemoTaskDecision, DemoTimeseriesPoint, HEAT_REGULATION } from '../demo/demoData';
import { useDemoData } from '../demo/demoState';
import { STALE_DATA_THRESHOLD_MINUTES, filterEventsByAgent, getLastEventAt, isEventAttention } from '../utils/agents';
import { getSeverityMeta } from '../utils/severity';

const resolveActionTypeLabel = (actionType: DemoActionLogEntry['actionType']) => {
  const map: Record<DemoActionLogEntry['actionType'], string> = {
    notify: 'Уведомление',
    assign_task: 'Поручение',
    request_info: 'Запрос данных',
    create_document: 'Документ',
    escalate: 'Эскалация',
    auto_close: 'Автозакрытие',
    comment: 'Комментарий',
  };
  return map[actionType];
};

const resolveResultStatus = (status: DemoActionLogEntry['resultStatus']) => {
  const map: Record<DemoActionLogEntry['resultStatus'], { color: string; label: string }> = {
    success: { color: 'green', label: 'Успешно' },
    pending: { color: 'orange', label: 'В работе' },
    failed: { color: 'red', label: 'Ошибка' },
  };
  return map[status];
};

const resolveTaskStatus = (status: DemoTaskDecision['status']) => {
  const map: Record<DemoTaskDecision['status'], { color: string; label: string }> = {
    Created: { color: 'blue', label: 'Создано' },
    InProgress: { color: 'gold', label: 'В работе' },
    Done: { color: 'green', label: 'Выполнено' },
    Overdue: { color: 'red', label: 'Просрочено' },
  };
  return map[status];
};

const resolvePriority = (priority: DemoTaskDecision['priority']) => {
  const map: Record<DemoTaskDecision['priority'], { color: string; label: string }> = {
    Высокий: { color: 'red', label: 'Высокий' },
    Средний: { color: 'gold', label: 'Средний' },
    Низкий: { color: 'default', label: 'Низкий' },
  };
  return map[priority];
};

const formatDuration = (minutes?: number | null) => {
  if (minutes == null || Number.isNaN(minutes) || !Number.isFinite(minutes)) return '—';
  const total = Math.round(minutes);
  if (total < 60) return `${total} мин`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${hours} ч ${mins} мин`;
};

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
  const { agents, events, actionLog, tasksDecisions, timeseries } = useDemoData();
  const agent = agents.find((item) => item.id === agentId) ?? null;
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  const scopedEvents = useMemo(() => {
    if (!agent) return [];
    return filterEventsByAgent(events, agent.id);
  }, [agent, events]);

  const activeEvents = useMemo(
    () =>
      scopedEvents.filter((event) => {
        const status = event.msg?.status;
        return status === 'New' || status === 'InProgress';
      }),
    [scopedEvents],
  );

  const attentionEvents = useMemo(
    () => activeEvents.filter(isEventAttention),
    [activeEvents],
  );

  const resolvedEvents = useMemo(
    () => scopedEvents.filter((event) => event.msg?.status === 'Resolved'),
    [scopedEvents],
  );

  const actionLogByAgent = useMemo(
    () => actionLog.filter((entry) => entry.agentId === agent?.id),
    [actionLog, agent?.id],
  );

  const tasksByAgent = useMemo(
    () => tasksDecisions.filter((task) => task.agentId === agent?.id),
    [tasksDecisions, agent?.id],
  );

  const kpi = useMemo(() => {
    const active = activeEvents.length;
    const critical = activeEvents.filter((event) => event.msg?.level === 1).length;
    const attention = attentionEvents.length;

    const responseTimes = scopedEvents
      .map((event) => {
        const createdAt = dayjs(event.created_at);
        const firstAction = actionLogByAgent
          .filter(
            (entry) =>
              entry.relatedEventId === event.id &&
              (entry.actionType === 'notify' || entry.actionType === 'assign_task'),
          )
          .sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)))[0];
        if (!firstAction) return null;
        return dayjs(firstAction.timestamp).diff(createdAt, 'minute');
      })
      .filter((value): value is number => value != null && value >= 0);
    const avgResponse =
      responseTimes.length > 0
        ? responseTimes.reduce((acc, value) => acc + value, 0) / responseTimes.length
        : null;

    const resolutionTimes = resolvedEvents
      .map((event) => {
        const updatedAt = event.msg?.updated_at;
        if (!updatedAt) return null;
        return dayjs(updatedAt).diff(dayjs(event.created_at), 'minute');
      })
      .filter((value): value is number => value != null && value >= 0);
    const avgResolution =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((acc, value) => acc + value, 0) / resolutionTimes.length
        : null;

    return { active, critical, attention, avgResponse, avgResolution };
  }, [activeEvents, attentionEvents, scopedEvents, actionLogByAgent, resolvedEvents]);

  const statusLabel = useMemo(() => {
    if (!agent) return 'Приостановлен';
    if (agent.isPaused) return 'Приостановлен';
    const lastEventAt = getLastEventAt(scopedEvents);
    const minutesAgo = lastEventAt ? dayjs().diff(lastEventAt, 'minute') : null;
    const isStale = minutesAgo == null || minutesAgo > STALE_DATA_THRESHOLD_MINUTES;
    return isStale ? 'Не получает данные' : 'Активен';
  }, [agent, scopedEvents]);

  const domains = useMemo(() => {
    const unique = new Set<string>();
    scopedEvents.forEach((event) => {
      const domain = event.msg?.domain;
      if (typeof domain === 'string' && domain.length > 0) {
        unique.add(domain);
      }
    });
    return Array.from(unique);
  }, [scopedEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedDomain === 'all') return scopedEvents;
    return scopedEvents.filter((event) => event.msg?.domain === selectedDomain);
  }, [scopedEvents, selectedDomain]);

  const attentionRegistry = useMemo(
    () => scopedEvents.filter((event) => event.msg?.requiresAttention === true),
    [scopedEvents],
  );

  const problemZones = useMemo(() => {
    const counts = scopedEvents.reduce<Record<string, number>>((acc, event) => {
      const address = event.msg?.location?.address;
      if (!address) return acc;
      acc[address] = (acc[address] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([address, count]) => ({ address, count }));
  }, [scopedEvents]);

  const series = timeseries[agent?.id as keyof typeof timeseries];
  const timeseriesColumns = useMemo<ColumnsType<DemoTimeseriesPoint>>(() => {
    const base: ColumnsType<DemoTimeseriesPoint> = [
      {
        title: 'Время',
        dataIndex: 'timestamp',
        render: (value: string) => dayjs(value).format('HH:mm'),
      },
    ];
    if (!series || series.length === 0) return base;
    const metrics = Object.keys(series[0].values);
    return [
      ...base,
      ...metrics.map((metric) => ({
        title: metric,
        dataIndex: ['values', metric],
        align: 'center' as const,
      })),
    ];
  }, [series]);

  const actionLogColumns: ColumnsType<DemoActionLogEntry> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      render: (value: string) => dayjs(value).format('DD.MM HH:mm'),
    },
    {
      title: 'Тип',
      dataIndex: 'actionType',
      render: (value: DemoActionLogEntry['actionType']) => (
        <Tag color="blue">{resolveActionTypeLabel(value)}</Tag>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'summary',
    },
    {
      title: 'Результат',
      dataIndex: 'resultStatus',
      render: (value: DemoActionLogEntry['resultStatus']) => {
        const meta = resolveResultStatus(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Событие',
      dataIndex: 'relatedEventId',
      align: 'center',
      render: (value: number) => <Tag>{`#${value}`}</Tag>,
    },
  ];

  const taskColumns: ColumnsType<DemoTaskDecision> = [
    {
      title: 'Решение / поручение',
      dataIndex: 'title',
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      render: (value: string) => dayjs(value).format('DD.MM HH:mm'),
    },
    {
      title: 'Срок',
      dataIndex: 'dueAt',
      render: (value: string) => dayjs(value).format('DD.MM HH:mm'),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (value: DemoTaskDecision['status']) => {
        const meta = resolveTaskStatus(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Приоритет',
      dataIndex: 'priority',
      render: (value: DemoTaskDecision['priority']) => {
        const meta = resolvePriority(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Исполнитель',
      dataIndex: 'assignee',
    },
    {
      title: 'События',
      dataIndex: 'linkedEventIds',
      render: (value: number[]) => value.map((id) => <Tag key={id}>{`#${id}`}</Tag>),
    },
  ];

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
  const isHeatAgent = agent.id === 'heat';

  return (
    <div className="page-shell">
      <div>
        <Space align="center">
          <Typography.Title level={3} className="page-title">
            {agent.name}
          </Typography.Title>
          {resolveStatusBadge(statusLabel)}
        </Space>
        <Typography.Paragraph type="secondary">
          {agent.responsibilityZone} · Последние данные: {updatedLabel}
        </Typography.Paragraph>
      </div>

      <DemoControlPanel />

      {isHeatAgent && (
        <Card title="Цифровой регламент обработки событий теплосетей" style={{ marginBottom: 16 }}>
          <Space direction="vertical" size={4}>
            <Typography.Text strong>{HEAT_REGULATION.name}</Typography.Text>
            <Typography.Text type="secondary">
              Дата регламента: {dayjs(HEAT_REGULATION.date).format('DD.MM.YYYY')}
            </Typography.Text>
            <Space wrap>
              <Tag color="blue">
                Давление: {HEAT_REGULATION.pressure} ± {HEAT_REGULATION.pressureDeviation} bar
              </Tag>
              <Tag color="blue">
                Диаметр: {HEAT_REGULATION.diameter} ± {HEAT_REGULATION.diameterDeviation} м
              </Tag>
            </Space>
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              Рекомендация: {HEAT_REGULATION.recommendation}
            </Typography.Paragraph>
          </Space>
        </Card>
      )}

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
            <Statistic title="Среднее время реакции" value={formatDuration(kpi.avgResponse)} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Среднее время устранения" value={formatDuration(kpi.avgResolution)} />
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
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Space align="center" wrap>
                    <Typography.Text type="secondary">Домен:</Typography.Text>
                    <Select
                      value={selectedDomain}
                      onChange={setSelectedDomain}
                      style={{ minWidth: 220 }}
                      options={[
                        { value: 'all', label: 'Все домены' },
                        ...domains.map((domain) => ({ value: domain, label: domain })),
                      ]}
                    />
                  </Space>
                  <EventsTable events={filteredEvents} />
                </Space>
              </Card>
            ),
          },
          {
            key: 'actions',
            label: 'Журнал действий заместителя',
            children: (
              <Card>
                {actionLogByAgent.length > 0 ? (
                  <Table
                    rowKey="id"
                    columns={actionLogColumns}
                    dataSource={actionLogByAgent}
                    pagination={false}
                  />
                ) : (
                  <Empty description="Нет данных по журналу действий" />
                )}
              </Card>
            ),
          },
          {
            key: 'tasks',
            label: 'Решения и поручения',
            children: (
              <Card>
                {tasksByAgent.length > 0 ? (
                  <Table
                    rowKey="id"
                    columns={taskColumns}
                    dataSource={tasksByAgent}
                    pagination={false}
                  />
                ) : (
                  <Empty description="Нет данных по решениям и поручениям" />
                )}
              </Card>
            ),
          },
          {
            key: 'attention',
            label: 'Требуют вмешательства',
            children: (
              <Card>
                {attentionRegistry.length > 0 ? (
                  <EventsTable events={attentionRegistry} />
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
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <div>
                    <Typography.Text strong>Динамика показателей за 24 часа</Typography.Text>
                    {series && series.length > 0 ? (
                      <Table
                        rowKey="timestamp"
                        columns={timeseriesColumns}
                        dataSource={series}
                        pagination={false}
                        size="small"
                      />
                    ) : (
                      <Empty description="Нет данных по динамике" />
                    )}
                  </div>
                  <div>
                    <Typography.Text strong>Проблемные зоны по повторяемости</Typography.Text>
                    {problemZones.length > 0 ? (
                      <Space direction="vertical">
                        {problemZones.map((zone) => (
                          <Space key={zone.address}>
                            <Tag color={zone.count > 2 ? 'red' : 'blue'}>{zone.count}</Tag>
                            <Typography.Text>{zone.address}</Typography.Text>
                          </Space>
                        ))}
                      </Space>
                    ) : (
                      <Empty description="Нет проблемных зон" />
                    )}
                  </div>
                </Space>
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
}

export default AgentPage;
