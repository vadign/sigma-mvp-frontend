import { useEffect, useMemo, useState } from 'react';
import { Badge, Card, Col, Empty, Row, Select, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { fetchEvents } from '../api/client';
import { EventResponse } from '../api/types';
import EventsTable from '../components/EventsTable';
import RegulationsPanel from '../components/RegulationsPanel';
import { DemoActionLogEntry, DemoTaskDecision, DemoTimeseriesPoint } from '../demo/demoData';
import { useDemoData } from '../demo/demoState';
import {
  STALE_DATA_THRESHOLD_MINUTES,
  filterEventsByAgent,
  getLastEventAt,
  isEventAttention,
  isEventClosed,
} from '../utils/agents';
import { getSeverityMeta } from '../utils/severity';

const METRIC_PALETTE = [
  { line: '#36cfc9', fill: 'rgba(54, 207, 201, 0.24)', surface: '#e6fffb' },
  { line: '#597ef7', fill: 'rgba(89, 126, 247, 0.22)', surface: '#f0f5ff' },
  { line: '#f759ab', fill: 'rgba(247, 89, 171, 0.22)', surface: '#fff0f6' },
  { line: '#fa8c16', fill: 'rgba(250, 140, 22, 0.2)', surface: '#fff7e6' },
];

const formatMetricValue = (value: number) => {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 100) return Math.round(value).toString();
  if (abs >= 10) return value.toFixed(1).replace(/\.0$/, '');
  return value.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1');
};

const formatTooltipValue = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return '—';
  return formatMetricValue(value);
};

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

type IncidentRecommendation = {
  done: boolean;
  text: string;
};

const resolveIncidentTitle = (incident: EventResponse) => {
  const msg = incident.msg ?? {};
  if (msg.text && typeof msg.text === 'string') return msg.text;
  if (msg.title && typeof msg.title === 'string') return msg.title;
  if (msg.msg && typeof msg.msg === 'string') return msg.msg;
  return `Инцидент #${incident.id}`;
};

const getIncidentRecommendations = (incident: EventResponse): IncidentRecommendation[] => {
  const recommendations = incident.msg?.recommendation;
  if (!Array.isArray(recommendations)) return [];
  return recommendations.filter(
    (item): item is IncidentRecommendation =>
      Boolean(item) && typeof item.text === 'string' && typeof item.done === 'boolean',
  );
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
  const { now, agents, events, actionLog, tasksDecisions, timeseries } = useDemoData();
  const agent = agents.find((item) => item.id === agentId) ?? null;
  const [selectedDomain, setSelectedDomain] = useState<string>('all');
  const [eventFilter, setEventFilter] = useState<'all' | 'active' | 'critical' | 'attention'>('all');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [incidents, setIncidents] = useState<EventResponse[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);

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

  const attentionCount = useMemo(
    () =>
      scopedEvents.filter(
        (event) => event.msg?.requiresAttention === true && !isEventClosed(event),
      ).length,
    [scopedEvents],
  );

  const actionLogByAgent = useMemo(
    () => actionLog.filter((entry) => entry.agentId === agent?.id),
    [actionLog, agent?.id],
  );

  const lastActionAt = useMemo(() => {
    if (actionLogByAgent.length === 0) return null;
    return actionLogByAgent.reduce((latest, entry) => {
      const timestamp = dayjs(entry.timestamp);
      if (!latest || timestamp.isAfter(latest)) return timestamp;
      return latest;
    }, null as dayjs.Dayjs | null);
  }, [actionLogByAgent]);

  const tasksByAgent = useMemo(
    () => tasksDecisions.filter((task) => task.agentId === agent?.id),
    [tasksDecisions, agent?.id],
  );

  const tasksInWorkCount = useMemo(
    () => tasksByAgent.filter((task) => task.status === 'Created' || task.status === 'InProgress').length,
    [tasksByAgent],
  );

  const overdueTasksCount = useMemo(
    () =>
      tasksByAgent.filter((task) => {
        const isOverdueByStatus = task.status === 'Overdue';
        const isOverdueByDate = dayjs(task.dueAt).isBefore(dayjs(now)) && task.status !== 'Done';
        return isOverdueByStatus || isOverdueByDate;
      }).length,
    [tasksByAgent, now],
  );

  const taskStatusCounts = useMemo(
    () =>
      tasksByAgent.reduce(
        (acc, task) => {
          acc[task.status] += 1;
          return acc;
        },
        { Created: 0, InProgress: 0, Done: 0, Overdue: 0 } as Record<DemoTaskDecision['status'], number>,
      ),
    [tasksByAgent],
  );

  const kpi = useMemo(() => {
    const active = activeEvents.length;
    const critical = activeEvents.filter((event) => event.msg?.level === 1 || event.msg?.level === 2).length;
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

  const lastEventAt = useMemo(() => getLastEventAt(scopedEvents), [scopedEvents]);
  const lastDataAt = useMemo(() => lastEventAt ?? lastActionAt, [lastEventAt, lastActionAt]);

  const statusLabel = useMemo(() => {
    if (!agent) return 'Приостановлен';
    if (agent.isPaused) return 'Приостановлен';
    const minutesAgo = lastDataAt ? dayjs(now).diff(lastDataAt, 'minute') : null;
    const isStale = minutesAgo == null || minutesAgo > STALE_DATA_THRESHOLD_MINUTES;
    return isStale ? 'Не получает данные' : 'Активен';
  }, [agent, lastDataAt, now]);

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

  useEffect(() => {
    if (!agent || agent.id !== 'heat') {
      return;
    }
    let isActive = true;
    setIncidentsLoading(true);
    setIncidentsError(null);
    fetchEvents({ order: 'desc', limit: 50 })
      .then((data) => {
        if (!isActive) return;
        setIncidents(data);
      })
      .catch((error: unknown) => {
        if (!isActive) return;
        setIncidentsError(error instanceof Error ? error.message : 'Не удалось загрузить список инцидентов.');
      })
      .finally(() => {
        if (!isActive) return;
        setIncidentsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [agent]);

  const filteredEvents = useMemo(() => {
    const domainFiltered =
      selectedDomain === 'all'
        ? scopedEvents
        : scopedEvents.filter((event) => event.msg?.domain === selectedDomain);
    switch (eventFilter) {
      case 'active':
        return domainFiltered.filter((event) => {
          const status = event.msg?.status;
          return status === 'New' || status === 'InProgress';
        });
      case 'critical':
        return domainFiltered.filter((event) => event.msg?.level === 1 || event.msg?.level === 2);
      case 'attention':
        return domainFiltered.filter((event) => event.msg?.requiresAttention === true && !isEventClosed(event));
      case 'all':
      default:
        return domainFiltered;
    }
  }, [scopedEvents, selectedDomain, eventFilter]);

  const attentionRegistry = useMemo(
    () => scopedEvents.filter((event) => event.msg?.requiresAttention === true),
    [scopedEvents],
  );

  const recentActions = useMemo(() => {
    return [...actionLogByAgent]
      .sort((a, b) => dayjs(b.timestamp).diff(dayjs(a.timestamp)))
      .slice(0, 10);
  }, [actionLogByAgent]);

  const tasksByDueDate = useMemo(() => {
    return [...tasksByAgent]
      .sort((a, b) => dayjs(a.dueAt).diff(dayjs(b.dueAt)))
      .slice(0, 8);
  }, [tasksByAgent]);

  const incidentColumns = useMemo<ColumnsType<EventResponse>>(
    () => [
      {
        title: 'Инцидент',
        dataIndex: 'msg',
        render: (_: unknown, incident: EventResponse) => {
          const msg = incident.msg ?? {};
          const description =
            (typeof msg.parameters === 'string' && msg.parameters) ||
            (typeof msg.description === 'string' && msg.description) ||
            (typeof msg.details === 'string' && msg.details) ||
            '';
          return (
            <Space direction="vertical" size={4} className="incident-main">
              <Typography.Text strong>{resolveIncidentTitle(incident)}</Typography.Text>
              {description ? (
                <Typography.Text type="secondary" className="incident-description">
                  {description}
                </Typography.Text>
              ) : (
                <Typography.Text type="secondary" className="incident-description">
                  Детали отсутствуют
                </Typography.Text>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Оценка',
        dataIndex: ['msg', 'estimation'],
        render: (value?: string) => <Typography.Text>{value || '—'}</Typography.Text>,
      },
      {
        title: 'Создан',
        dataIndex: 'created_at',
        render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm'),
      },
      {
        title: 'Чек-лист оператора/диспетчера',
        dataIndex: 'msg',
        render: (_: unknown, incident: EventResponse) => {
          const recommendations = getIncidentRecommendations(incident);
          return (
            <Space direction="vertical" size={8} className="incident-checklist">
              {recommendations.length > 0 ? (
                recommendations.map((step, index) => (
                  <Space key={`${incident.id}-${index}`} align="start" size="small">
                    <Tag color={step.done ? 'green' : 'default'} className="incident-status-tag">
                      {step.done ? 'Выполнено' : 'Не выполнено'}
                    </Tag>
                    <Typography.Text>{step.text}</Typography.Text>
                  </Space>
                ))
              ) : (
                <Typography.Text type="secondary">Чек-лист недоступен.</Typography.Text>
              )}
            </Space>
          );
        },
      },
    ],
    [],
  );

  const lastDayEvents = useMemo(() => {
    const since = dayjs(now).subtract(24, 'hour');
    return scopedEvents.filter((event) => dayjs(event.created_at).isAfter(since));
  }, [scopedEvents, now]);

  const problemZones = useMemo(() => {
    const counts = lastDayEvents.reduce<Record<string, number>>((acc, event) => {
      const address = event.msg?.location?.address;
      if (!address) return acc;
      acc[address] = (acc[address] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([address, count]) => ({ address, count }));
  }, [lastDayEvents]);

  const repeatabilityStats = useMemo(() => {
    const counts = lastDayEvents.reduce<Record<string, number>>((acc, event) => {
      const address = event.msg?.location?.address ?? 'Без адреса';
      const title = event.msg?.title ?? 'Без названия';
      const key = `${address}::${title}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts)
      .filter(([, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => {
        const [address, title] = key.split('::');
        return { address, title, count };
      });
  }, [lastDayEvents]);

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

  const metricsDashboard = useMemo(() => {
    if (!series || series.length === 0) return [];
    const metrics = Object.keys(series[0].values ?? {});
    return metrics.map((metric, index) => {
      const values = series.map((point) => Number(point.values[metric] ?? 0)).filter((value) => Number.isFinite(value));
      const safeValues = values.length > 0 ? values : [0];
      const current = safeValues[safeValues.length - 1] ?? 0;
      const previous = safeValues[safeValues.length - 2] ?? current;
      const delta = current - previous;
      const avg = safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
      const min = Math.min(...safeValues);
      const max = Math.max(...safeValues);
      const palette = METRIC_PALETTE[index % METRIC_PALETTE.length];
      const chartData = series.map((point, idx) => ({
        index: idx,
        value: Number.isFinite(Number(point.values[metric])) ? Number(point.values[metric]) : null,
        label: dayjs(point.timestamp).format('HH:mm'),
      }));
      return {
        metric,
        values: safeValues,
        current,
        delta,
        avg,
        min,
        max,
        palette,
        chartData,
      };
    });
  }, [series]);

  const renderMetricTooltip = ({ active, payload }: TooltipContentProps<number, string>) => {
    if (!active || payload.length === 0) return null;
    const entry = payload[0] as { value?: number | null; payload?: { label?: string } } | undefined;
    if (!entry) return null;
    return (
      <div className="metric-tooltip">
        <Typography.Text type="secondary">{entry.payload?.label ?? '—'}</Typography.Text>
        <Typography.Text strong>{formatTooltipValue(entry.value)}</Typography.Text>
      </div>
    );
  };

  const actionLogColumns: ColumnsType<DemoActionLogEntry> = [
    {
      title: 'Время',
      dataIndex: 'timestamp',
      render: (value: string) => dayjs(value).format('DD.MM HH:mm'),
    },
    {
      title: 'Тип',
      dataIndex: 'actionType',
      render: (value: DemoActionLogEntry['actionType']) => <Tag>{resolveActionTypeLabel(value)}</Tag>,
    },
    {
      title: 'Сводка',
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

  const dashboardActionColumns: ColumnsType<DemoActionLogEntry> = [
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

  const handleEventNavigation = (filter: 'all' | 'active' | 'critical' | 'attention') => {
    setEventFilter(filter);
    setActiveTab('registry');
  };

  const handleTaskNavigation = () => {
    setActiveTab('tasks');
  };

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

  const updatedLabel = lastDataAt ? lastDataAt.format('DD.MM.YYYY HH:mm') : '—';
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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'dashboard',
            label: 'Дашборд',
            children: (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Card>
                  <Row gutter={[16, 16]} align="middle">
                    <Col xs={24} md={8}>
                      <Space direction="vertical" size={4}>
                        <Typography.Text strong>{agent.name}</Typography.Text>
                        <Typography.Text type="secondary">{agent.responsibilityZone}</Typography.Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={6}>
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">Статус</Typography.Text>
                        {resolveStatusBadge(statusLabel)}
                      </Space>
                    </Col>
                    <Col xs={24} md={5}>
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">Последние данные</Typography.Text>
                        <Typography.Text>{updatedLabel}</Typography.Text>
                      </Space>
                    </Col>
                    <Col xs={24} md={5}>
                      <Space direction="vertical" size={4}>
                        <Typography.Text type="secondary">Требуют внимания</Typography.Text>
                        <Typography.Link onClick={() => handleEventNavigation('attention')}>
                          {attentionCount}
                        </Typography.Link>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                <Row gutter={[16, 16]}>
                  <Col xs={24} md={8} lg={4}>
                    <Card hoverable onClick={() => handleEventNavigation('active')}>
                      <Statistic title="Активные инциденты" value={kpi.active} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8} lg={4}>
                    <Card hoverable onClick={() => handleEventNavigation('critical')}>
                      <Statistic
                        title="Критичные инциденты"
                        value={kpi.critical}
                        valueStyle={{ color: getSeverityMeta(1).color }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} md={8} lg={4}>
                    <Card hoverable onClick={() => handleEventNavigation('attention')}>
                      <Statistic title="Требуют вмешательства" value={kpi.attention} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8} lg={4}>
                    <Card hoverable onClick={handleTaskNavigation}>
                      <Statistic title="Поручения в работе" value={tasksInWorkCount} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8} lg={4}>
                    <Card hoverable onClick={handleTaskNavigation}>
                      <Statistic title="Просрочено поручений" value={overdueTasksCount} />
                    </Card>
                  </Col>
                  <Col xs={24} md={8} lg={4}>
                    <Card>
                      <Statistic title="Среднее время реакции" value={formatDuration(kpi.avgResponse)} />
                    </Card>
                  </Col>
                </Row>

                <Card title="Активность помощника">
                  {recentActions.length > 0 ? (
                    <Table
                      rowKey="id"
                      columns={dashboardActionColumns}
                      dataSource={recentActions}
                      pagination={false}
                      size="small"
                    />
                  ) : (
                    <Empty description="Нет данных по последним действиям" />
                  )}
                </Card>

                <Card title="Контроль исполнения">
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <Space wrap>
                      <Tag color="blue">{`Создано: ${taskStatusCounts.Created}`}</Tag>
                      <Tag color="gold">{`В работе: ${taskStatusCounts.InProgress}`}</Tag>
                      <Tag color="green">{`Выполнено: ${taskStatusCounts.Done}`}</Tag>
                      <Tag color="red">{`Просрочено: ${taskStatusCounts.Overdue}`}</Tag>
                    </Space>
                    {tasksByDueDate.length > 0 ? (
                      <Table
                        rowKey="id"
                        columns={taskColumns}
                        dataSource={tasksByDueDate}
                        pagination={false}
                        size="small"
                      />
                    ) : (
                      <Empty description="Нет данных по поручениям" />
                    )}
                  </Space>
                </Card>

                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card title="Топ проблемных локаций (24 часа)">
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
                        <Empty description="Нет проблемных локаций" />
                      )}
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card title="Повторяемость событий (24 часа)">
                      {repeatabilityStats.length > 0 ? (
                        <Space direction="vertical">
                          {repeatabilityStats.map((item) => (
                            <Space key={`${item.address}-${item.title}`}>
                              <Tag color={item.count > 2 ? 'red' : 'orange'}>{item.count}</Tag>
                              <Typography.Text>
                                {item.title} · {item.address}
                              </Typography.Text>
                            </Space>
                          ))}
                        </Space>
                      ) : (
                        <Empty description="Повторяемость не выявлена" />
                      )}
                    </Card>
                  </Col>
                </Row>

                <Card title="Динамика показателей за 24 часа">
                  <Space direction="vertical" size="large" style={{ width: '100%' }}>
                    {metricsDashboard.length > 0 && (
                      <div className="metrics-dashboard">
                        {metricsDashboard.map((metric, index) => {
                          const deltaLabel = `${metric.delta >= 0 ? '+' : ''}${formatMetricValue(metric.delta)}`;
                          const deltaColor = metric.delta > 0 ? 'green' : metric.delta < 0 ? 'red' : 'default';
                          const gradientId = `metric-gradient-${index}`;
                          return (
                            <div
                              key={metric.metric}
                              className="metric-card"
                              style={{
                                background: `linear-gradient(135deg, ${metric.palette.surface} 0%, #ffffff 70%)`,
                                borderColor: metric.palette.surface,
                              }}
                            >
                              <div className="metric-card-header">
                                <Typography.Text strong>{metric.metric}</Typography.Text>
                                <Tag color={deltaColor}>{deltaLabel}</Tag>
                              </div>
                              <div className="metric-card-body">
                                <Typography.Text className="metric-card-value">
                                  {formatMetricValue(metric.current)}
                                </Typography.Text>
                                <Typography.Text className="metric-card-sub" type="secondary">
                                  Мин {formatMetricValue(metric.min)} · Макс {formatMetricValue(metric.max)} · Ср{' '}
                                  {formatMetricValue(metric.avg)}
                                </Typography.Text>
                              </div>
                              <div className="metric-sparkline">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={metric.chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={metric.palette.line} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={metric.palette.line} stopOpacity={0.05} />
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="index" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip content={renderMetricTooltip} cursor={{ stroke: metric.palette.line, strokeDasharray: '3 3' }} />
                                    <Area
                                      type="monotone"
                                      dataKey="value"
                                      stroke={metric.palette.line}
                                      strokeWidth={2}
                                      fill={`url(#${gradientId})`}
                                      dot={false}
                                      activeDot={{ r: 4 }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                  </Space>
                </Card>
              </Space>
            ),
          },
          ...(isHeatAgent
            ? [
                {
                  key: 'regulations',
                  label: 'Регламенты',
                  children: <RegulationsPanel />,
                },
                {
                  key: 'incidents',
                  label: 'Инциденты',
                  children: (
                    <Card>
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {incidentsError && <Typography.Text type="danger">{incidentsError}</Typography.Text>}
                        <Table
                          rowKey="id"
                          className="incident-table"
                          columns={incidentColumns}
                          dataSource={incidents}
                          loading={incidentsLoading}
                          pagination={{ pageSize: 5 }}
                          locale={{
                            emptyText: incidentsError
                              ? 'Не удалось загрузить инциденты.'
                              : 'Инциденты не найдены.',
                          }}
                        />
                      </Space>
                    </Card>
                  ),
                },
              ]
            : []),
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
                    <Typography.Text type="secondary">Фильтр:</Typography.Text>
                    <Select
                      value={eventFilter}
                      onChange={(value) => setEventFilter(value)}
                      style={{ minWidth: 220 }}
                      options={[
                        { value: 'all', label: 'Все события' },
                        { value: 'active', label: 'Активные' },
                        { value: 'critical', label: 'Критичные' },
                        { value: 'attention', label: 'Требуют внимания' },
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
                    {metricsDashboard.length > 0 && (
                      <div className="metrics-dashboard">
                        {metricsDashboard.map((metric, index) => {
                          const deltaLabel = `${metric.delta >= 0 ? '+' : ''}${formatMetricValue(metric.delta)}`;
                          const deltaColor = metric.delta > 0 ? 'green' : metric.delta < 0 ? 'red' : 'default';
                          const gradientId = `metric-gradient-secondary-${index}`;
                          return (
                            <div
                              key={metric.metric}
                              className="metric-card"
                              style={{
                                background: `linear-gradient(135deg, ${metric.palette.surface} 0%, #ffffff 70%)`,
                                borderColor: metric.palette.surface,
                              }}
                            >
                              <div className="metric-card-header">
                                <Typography.Text strong>{metric.metric}</Typography.Text>
                                <Tag color={deltaColor}>{deltaLabel}</Tag>
                              </div>
                              <div className="metric-card-body">
                                <Typography.Text className="metric-card-value">
                                  {formatMetricValue(metric.current)}
                                </Typography.Text>
                                <Typography.Text className="metric-card-sub" type="secondary">
                                  Мин {formatMetricValue(metric.min)} · Макс {formatMetricValue(metric.max)} · Ср{' '}
                                  {formatMetricValue(metric.avg)}
                                </Typography.Text>
                              </div>
                              <div className="metric-sparkline">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={metric.chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={metric.palette.line} stopOpacity={0.35} />
                                        <stop offset="100%" stopColor={metric.palette.line} stopOpacity={0.05} />
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="index" hide />
                                    <YAxis hide domain={['auto', 'auto']} />
                                    <Tooltip content={renderMetricTooltip} cursor={{ stroke: metric.palette.line, strokeDasharray: '3 3' }} />
                                    <Area
                                      type="monotone"
                                      dataKey="value"
                                      stroke={metric.palette.line}
                                      strokeWidth={2}
                                      fill={`url(#${gradientId})`}
                                      dot={false}
                                      activeDot={{ r: 4 }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
