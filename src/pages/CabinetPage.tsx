import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AgentSettingsModal from '../components/AgentSettingsModal';
import { EventResponse } from '../api/types';
import { DemoActionLogEntry, DemoTaskDecision, DemoTimeseriesPoint } from '../demo/demoData';
import { useDemoData } from '../demo/demoState';
import { createRequest, DevRequestDomain, DevRequestPriority } from '../features/devRequests/store';
import {
  AgentId,
  STALE_DATA_THRESHOLD_MINUTES,
  filterEventsByAgent,
  getEventStatusLabel,
  getLastEventAt,
  isEventAttention,
  isEventClosed,
  resolveAgentIdForEvent,
} from '../utils/agents';
import { getSeverityMeta } from '../utils/severity';
import { getAgentSettings, updateAgentSettings, useAgentSettings } from '../features/agentSettings/store';

interface AgentRow {
  id: AgentId;
  title: string;
  responsibility: string;
  attentionCount: number;
  activeIncidents: number;
  criticalIncidents: number;
  overdueTasks: number;
  status: 'Активен' | 'Не получает данные' | 'Приостановлен';
  lastDataAt: dayjs.Dayjs | null;
  updatedAtLabel: string;
  updatedAtTooltip?: string;
  decisionMode: 'recommend' | 'confirm' | 'auto';
}

interface RequestFormValues {
  domain: DevRequestDomain;
  assistantName: string;
  responsibilityZone: string;
  description: string;
  priority: DevRequestPriority;
  contact?: string;
}

interface KpiCard {
  key: string;
  title: string;
  value: number | string;
  hint?: string;
  onClick: () => void;
}

const resolveStatusTag = (status: AgentRow['status']) => {
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

const resolveActionTypeColor = (actionType: DemoActionLogEntry['actionType']) => {
  const map: Record<DemoActionLogEntry['actionType'], string> = {
    notify: 'blue',
    assign_task: 'gold',
    request_info: 'geekblue',
    create_document: 'purple',
    escalate: 'red',
    auto_close: 'green',
    comment: 'default',
  };
  return map[actionType];
};

const resolveDecisionModeMeta = (mode: AgentRow['decisionMode']) => {
  switch (mode) {
    case 'auto':
      return { label: 'Автономно', color: 'green' };
    case 'recommend':
      return { label: 'Рекомендовать', color: 'blue' };
    case 'confirm':
    default:
      return { label: 'С подтверждением', color: 'gold' };
  }
};

const resolveCompactStatusMeta = (status: AgentRow['status']) => {
  switch (status) {
    case 'Активен':
      return { label: 'Активен', color: 'green' };
    case 'Не получает данные':
      return { label: 'Нет данных', color: 'gold' };
    case 'Приостановлен':
    default:
      return { label: 'Пауза', color: 'default' };
  }
};

const resolveTaskOverdue = (task: DemoTaskDecision, now: number) => {
  return task.status === 'Overdue' || (dayjs(task.dueAt).isBefore(dayjs(now)) && task.status !== 'Done');
};

const findFirstResponseMinutes = (event: EventResponse, log: DemoActionLogEntry[]) => {
  const firstAction = log
    .filter((entry) => entry.relatedEventId === event.id && (entry.actionType === 'notify' || entry.actionType === 'assign_task'))
    .sort((a, b) => dayjs(a.timestamp).diff(dayjs(b.timestamp)))[0];

  if (!firstAction) return null;

  const value = dayjs(firstAction.timestamp).diff(dayjs(event.created_at), 'minute');
  return value >= 0 ? value : null;
};

function CabinetPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<RequestFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'assistants' | 'settings'>('overview');
  const [settingsAgentId, setSettingsAgentId] = useState<AgentId | null>(null);

  const { now, agents, events, actionLog, tasksDecisions, timeseries } = useDemoData();
  const agentSettingsStore = useAgentSettings();
  const formValues = Form.useWatch([], form);

  useEffect(() => {
    const settingsParam = searchParams.get('settings');
    if (settingsParam === 'heat' || settingsParam === 'air' || settingsParam === 'noise') {
      setSettingsAgentId(settingsParam);
      setActiveTab('settings');
    }
  }, [searchParams]);

  const openSettings = (agentId: AgentId) => {
    setSettingsAgentId(agentId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('settings', agentId);
    setSearchParams(nextParams, { replace: true });
  };

  const closeSettings = () => {
    setSettingsAgentId(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('settings');
    setSearchParams(nextParams, { replace: true });
  };

  const toggleAssistantEnabled = (agentId: AgentId, enabled: boolean) => {
    updateAgentSettings(agentId, { isPaused: !enabled });
    const assistantName = agents.find((agent) => agent.id === agentId)?.name ?? 'Помощник';
    message.success(`${assistantName}: ${enabled ? 'включен' : 'выключен'}`);
  };

  const isSubmitEnabled = useMemo(() => {
    if (!formValues) return false;

    const requiredFilled = [
      formValues.domain,
      formValues.priority,
      formValues.assistantName?.trim(),
      formValues.responsibilityZone?.trim(),
      formValues.description?.trim(),
    ].every(Boolean);

    if (!requiredFilled) return false;

    const fieldErrors = form.getFieldsError(['domain', 'assistantName', 'responsibilityZone', 'description', 'priority']);
    return fieldErrors.every((field) => field.errors.length === 0);
  }, [form, formValues]);

  const handleSubmitRequest = async () => {
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      createRequest({
        createdBy: 'Управленец',
        domain: values.domain,
        assistantName: values.assistantName,
        responsibilityZone: values.responsibilityZone,
        description: values.description,
        priority: values.priority,
        contact: values.contact,
      });
      message.success('Заявка создана');
      setIsModalOpen(false);
      form.resetFields();
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeEvents = useMemo(
    () => events.filter((event) => event.msg?.status === 'New' || event.msg?.status === 'InProgress'),
    [events],
  );

  const criticalActiveEvents = useMemo(
    () => activeEvents.filter((event) => event.msg?.level === 1 || event.msg?.level === 2),
    [activeEvents],
  );

  const attentionEvents = useMemo(() => events.filter(isEventAttention), [events]);

  const tasksInWork = useMemo(
    () => tasksDecisions.filter((task) => task.status === 'Created' || task.status === 'InProgress'),
    [tasksDecisions],
  );

  const overdueTasks = useMemo(
    () => tasksDecisions.filter((task) => resolveTaskOverdue(task, now)),
    [tasksDecisions, now],
  );

  const lastDataAtGlobal = useMemo(() => {
    if (events.length > 0) {
      return events.reduce((latest, event) => {
        const timestamp = dayjs(event.msg?.updated_at ?? event.created_at);
        if (!latest || timestamp.isAfter(latest)) return timestamp;
        return latest;
      }, null as dayjs.Dayjs | null);
    }

    if (actionLog.length > 0) {
      return actionLog.reduce((latest, entry) => {
        const timestamp = dayjs(entry.timestamp);
        if (!latest || timestamp.isAfter(latest)) return timestamp;
        return latest;
      }, null as dayjs.Dayjs | null);
    }

    return null;
  }, [events, actionLog]);

  const agentRows = useMemo<AgentRow[]>(() => {
    return agents
      .map((agent) => {
        const scopedEvents = filterEventsByAgent(events, agent.id);
        const attentionCount = scopedEvents.filter(isEventAttention).length;
        const activeIncidents = scopedEvents.filter((event) => event.msg?.status === 'New' || event.msg?.status === 'InProgress').length;
        const criticalIncidents = scopedEvents.filter(
          (event) => (event.msg?.status === 'New' || event.msg?.status === 'InProgress') && (event.msg?.level === 1 || event.msg?.level === 2),
        ).length;

        const tasksByAgent = tasksDecisions.filter((task) => task.agentId === agent.id);
        const overdueTaskCount = tasksByAgent.filter((task) => resolveTaskOverdue(task, now)).length;

        const lastEventAt = getLastEventAt(scopedEvents);
        const actionByAgent = actionLog.filter((entry) => entry.agentId === agent.id);
        const lastActionAt = actionByAgent.reduce((latest, entry) => {
          const timestamp = dayjs(entry.timestamp);
          if (!latest || timestamp.isAfter(latest)) return timestamp;
          return latest;
        }, null as dayjs.Dayjs | null);
        const lastDataAt = lastEventAt ?? lastActionAt;

        const settings = agentSettingsStore[agent.id] ?? getAgentSettings(agent.id);
        const minutesAgo = lastDataAt ? dayjs(now).diff(lastDataAt, 'minute') : null;
        const threshold = settings.noDataThresholdMinutes ?? STALE_DATA_THRESHOLD_MINUTES;
        const isStale = minutesAgo == null || minutesAgo > threshold;
        const status: AgentRow['status'] = settings.isPaused
          ? 'Приостановлен'
          : isStale
            ? 'Не получает данные'
            : 'Активен';

        const updatedAtLabel = lastDataAt ? dayjs(lastDataAt).format('DD.MM.YYYY HH:mm') : '—';
        const updatedAtTooltip = isStale
          ? `Нет новых данных более ${threshold} минут`
          : undefined;
        return {
          id: agent.id,
          title: agent.name,
          responsibility: agent.responsibilityZone,
          attentionCount,
          activeIncidents,
          criticalIncidents,
          overdueTasks: overdueTaskCount,
          status,
          lastDataAt,
          updatedAtLabel,
          updatedAtTooltip,
          decisionMode: settings.decisionMode,
        };
      })
      .sort((a, b) => {
        if (b.attentionCount !== a.attentionCount) return b.attentionCount - a.attentionCount;
        return b.criticalIncidents - a.criticalIncidents;
      });
  }, [agents, events, tasksDecisions, now, actionLog, agentSettingsStore]);

  const assistantsByStatus = useMemo(
    () =>
      agentRows.reduce(
        (acc, row) => {
          if (row.status === 'Активен') acc.active += 1;
          if (row.status === 'Не получает данные') acc.stale += 1;
          if (row.status === 'Приостановлен') acc.paused += 1;
          return acc;
        },
        { active: 0, stale: 0, paused: 0 },
      ),
    [agentRows],
  );

  const responseTimes = useMemo(
    () =>
      events
        .map((event) => findFirstResponseMinutes(event, actionLog))
        .filter((value): value is number => value != null),
    [events, actionLog],
  );

  const avgResponseTime = useMemo(() => {
    if (responseTimes.length === 0) return null;
    return Math.round(responseTimes.reduce((acc, value) => acc + value, 0) / responseTimes.length);
  }, [responseTimes]);

  const topAttentionEvents = useMemo(
    () => attentionEvents.sort((a, b) => dayjs(b.msg?.updated_at ?? b.created_at).valueOf() - dayjs(a.msg?.updated_at ?? a.created_at).valueOf()).slice(0, 10),
    [attentionEvents],
  );

  const latestActions = useMemo(
    () => [...actionLog].sort((a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf()).slice(0, 12),
    [actionLog],
  );

  const timeseriesSummary = useMemo(
    () =>
      Object.entries(timeseries).map(([agentId, points]) => {
        const metrics = Object.keys(points[0]?.values ?? {});
        const latestPoints = points.slice(-6);
        const summary = metrics.map((metric) => {
          const values = points.map((point) => point.values[metric]).filter((value) => Number.isFinite(value));
          const current = latestPoints[latestPoints.length - 1]?.values?.[metric];
          return {
            metric,
            min: values.length ? Math.min(...values) : null,
            max: values.length ? Math.max(...values) : null,
            current: Number.isFinite(current) ? current : null,
          };
        });

        return { agentId: agentId as AgentId, latestPoints, summary };
      }),
    [timeseries],
  );

  const attentionLeader = agentRows[0];

  const kpiCards = useMemo<KpiCard[]>(
    () => [
      {
        key: 'active-incidents',
        title: 'Активные инциденты',
        value: activeEvents.length,
        onClick: () => setActiveTab('assistants'),
      },
      {
        key: 'critical-incidents',
        title: 'Критичные инциденты',
        value: criticalActiveEvents.length,
        onClick: () => setActiveTab('assistants'),
      },
      {
        key: 'attention-incidents',
        title: 'Требуют внимания',
        value: attentionEvents.length,
        onClick: () => {
          if (attentionLeader?.attentionCount > 0) {
            navigate(`/cabinet/${attentionLeader.id}`);
            return;
          }
          setActiveTab('assistants');
        },
      },
      {
        key: 'tasks-in-work',
        title: 'Поручения в работе',
        value: tasksInWork.length,
        onClick: () => setActiveTab('assistants'),
      },
      {
        key: 'tasks-overdue',
        title: 'Просрочено поручений',
        value: overdueTasks.length,
        onClick: () => setActiveTab('assistants'),
      },
      {
        key: 'avg-response',
        title: 'Среднее время реакции',
        value: avgResponseTime == null ? '—' : `${avgResponseTime} мин`,
        hint: avgResponseTime == null ? 'Недостаточно данных для расчета' : undefined,
        onClick: () => setActiveTab('assistants'),
      },
    ],
    [activeEvents.length, criticalActiveEvents.length, attentionEvents.length, attentionLeader, tasksInWork.length, overdueTasks.length, avgResponseTime, navigate],
  );

  const columns: ColumnsType<AgentRow> = [
    {
      title: 'Помощник',
      dataIndex: 'title',
      render: (_: string, record) => (
        <Typography.Link onClick={() => navigate(`/cabinet/${record.id}`)}>{record.title}</Typography.Link>
      ),
    },
    {
      title: 'Зона ответственности',
      dataIndex: 'responsibility',
      render: (value: string) => <Typography.Text>{value}</Typography.Text>,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      render: (_: string, record) =>
        record.updatedAtTooltip ? <Tooltip title={record.updatedAtTooltip}>{resolveStatusTag(record.status)}</Tooltip> : resolveStatusTag(record.status),
    },
    {
      title: 'Требуют внимания',
      dataIndex: 'attentionCount',
      align: 'center',
      render: (_: number, record) => (
        <Typography.Link
          onClick={() => navigate(`/cabinet/${record.id}`)}
          style={{ color: record.attentionCount > 0 ? '#cf1322' : undefined, fontWeight: 600 }}
        >
          {record.attentionCount}
        </Typography.Link>
      ),
    },
    {
      title: 'Активные инциденты',
      dataIndex: 'activeIncidents',
      align: 'center',
    },
    {
      title: 'Критичные',
      dataIndex: 'criticalIncidents',
      align: 'center',
      render: (value: number) => <Tag color={value > 0 ? 'volcano' : 'default'}>{value}</Tag>,
    },
    {
      title: 'Просрочено поручений',
      dataIndex: 'overdueTasks',
      align: 'center',
      render: (value: number) => <Tag color={value > 0 ? 'red' : 'default'}>{value}</Tag>,
    },
    {
      title: 'Последние данные',
      dataIndex: 'updatedAtLabel',
      render: (_: string, record) => (
        <Typography.Text type={record.updatedAtLabel === '—' ? 'secondary' : undefined}>{record.updatedAtLabel}</Typography.Text>
      ),
    },
    {
      title: '',
      key: 'action',
      align: 'right',
      render: (_: unknown, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/cabinet/${record.id}`)}>
            Открыть
          </Button>
        </Space>
      ),
    },
  ];

  const settingsColumns: ColumnsType<AgentRow> = [
    {
      title: 'Помощник',
      dataIndex: 'title',
      width: 220,
      render: (_: string, record) => (
        <Tooltip title={record.title}>
          <Typography.Link
            onClick={() => navigate(`/cabinet/${record.id}`)}
            style={{ display: 'inline-block', maxWidth: 210, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {record.title}
          </Typography.Link>
        </Tooltip>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      width: 130,
      render: (_: string, record) =>
        record.updatedAtTooltip ? (
          <Tooltip title={record.updatedAtTooltip}>
            <Tag color={resolveCompactStatusMeta(record.status).color}>{resolveCompactStatusMeta(record.status).label}</Tag>
          </Tooltip>
        ) : (
          <Tag color={resolveCompactStatusMeta(record.status).color}>{resolveCompactStatusMeta(record.status).label}</Tag>
        ),
    },
    {
      title: 'Режим решений',
      dataIndex: 'decisionMode',
      width: 190,
      render: (value: AgentRow['decisionMode']) => {
        const meta = resolveDecisionModeMeta(value);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: 'Вкл/Выкл',
      key: 'enabled',
      align: 'center',
      width: 110,
      render: (_: unknown, record) => (
        <Switch
          checked={record.status !== 'Приостановлен'}
          checkedChildren="Вкл"
          unCheckedChildren="Выкл"
          onChange={(value) => toggleAssistantEnabled(record.id, value)}
        />
      ),
    },
    {
      title: 'Управление',
      key: 'settings',
      align: 'right',
      width: 150,
      render: (_: unknown, record) => (
        <Button type="primary" size="small" onClick={() => openSettings(record.id)}>
          Настройки
        </Button>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={3} className="page-title">
            Личный кабинет
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Общая сводка по цифровым помощникам и быстрый переход к детализации по каждому направлению.
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Запросить нового цифрового помощника
        </Button>
      </Space>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'overview' | 'assistants' | 'settings')}
        items={[
          {
            key: 'overview',
            label: 'Общий дашборд',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                <Card>
                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    <div>
                      <Typography.Title level={4} style={{ marginBottom: 8 }}>
                        Общий дашборд
                      </Typography.Title>
                      <Typography.Text type="secondary">
                        Последнее обновление: {lastDataAtGlobal ? dayjs(lastDataAtGlobal).format('DD.MM.YYYY HH:mm:ss') : '—'}
                      </Typography.Text>
                    </div>
                  </Space>
                </Card>

                <Row gutter={[16, 16]}>
                  {kpiCards.map((card) => (
                    <Col key={card.key} xs={24} sm={12} xl={8}>
                      <Card hoverable onClick={card.onClick}>
                        <Statistic title={card.title} value={card.value} />
                        {card.hint ? <Typography.Text type="secondary">{card.hint}</Typography.Text> : null}
                      </Card>
                    </Col>
                  ))}
                </Row>

                <Card title="Сводка по помощникам">
                  <Table rowKey="id" dataSource={agentRows} columns={columns} pagination={false} />
                  <Typography.Text type="secondary">
                    Сортировка по полю «Требуют внимания» (убывание), затем по полю «Критичные» (убывание).
                  </Typography.Text>
                </Card>

                <Card title="Требуют вмешательства сейчас">
                  <Table
                    rowKey="id"
                    dataSource={topAttentionEvents}
                    pagination={false}
                    columns={[
                      {
                        title: 'Время',
                        key: 'time',
                        render: (_: unknown, record) => dayjs(record.msg?.updated_at ?? record.created_at).format('DD.MM HH:mm'),
                      },
                      {
                        title: 'Домен',
                        key: 'domain',
                        render: (_: unknown, record) => <Tag color="blue">{record.msg?.domain ?? '—'}</Tag>,
                      },
                      {
                        title: 'Событие',
                        key: 'title',
                        render: (_: unknown, record) => <Typography.Text>{record.msg?.title ?? `Событие #${record.id}`}</Typography.Text>,
                      },
                      {
                        title: 'Критичность',
                        key: 'severity',
                        render: (_: unknown, record) => <Tag color={record.msg?.level === 1 ? 'red' : record.msg?.level === 2 ? 'orange' : 'default'}>{getSeverityMeta(record.msg?.level).label}</Tag>,
                      },
                      {
                        title: 'Локация',
                        key: 'location',
                        render: (_: unknown, record) => record.msg?.location?.address ?? '—',
                      },
                      {
                        title: 'Статус',
                        key: 'status',
                        width: 150,
                        render: (_: unknown, record) => (
                          <span className="event-status-nowrap">
                            <Badge status={isEventClosed(record) ? 'default' : 'processing'} text={getEventStatusLabel(record.msg?.status)} />
                          </span>
                        ),
                      },
                    ]}
                    onRow={(record) => ({
                      onClick: () => {
                        const target = resolveAgentIdForEvent(record);
                        if (target) navigate(`/cabinet/${target}`);
                      },
                      style: { cursor: 'pointer' },
                    })}
                  />
                </Card>

                <Card title="Последние действия помощников">
                  <Table
                    rowKey="id"
                    dataSource={latestActions}
                    pagination={false}
                    columns={[
                      {
                        title: 'Время',
                        key: 'time',
                        render: (_: unknown, record: DemoActionLogEntry) => dayjs(record.timestamp).format('DD.MM HH:mm'),
                      },
                      {
                        title: 'Помощник',
                        key: 'agent',
                        render: (_: unknown, record: DemoActionLogEntry) => {
                          const title = agents.find((agent) => agent.id === record.agentId)?.name ?? record.agentId;
                          return <Typography.Text style={{ color: '#1677ff' }}>{title}</Typography.Text>;
                        },
                      },
                      {
                        title: 'Тип действия',
                        key: 'actionType',
                        render: (_: unknown, record: DemoActionLogEntry) => <Tag color={resolveActionTypeColor(record.actionType)}>{resolveActionTypeLabel(record.actionType)}</Tag>,
                      },
                      {
                        title: 'Описание',
                        dataIndex: 'summary',
                      },
                      {
                        title: 'Связанное событие',
                        key: 'event',
                        render: (_: unknown, record: DemoActionLogEntry) => `#${record.relatedEventId}`,
                      },
                    ]}
                    onRow={(record) => ({
                      onClick: () => navigate(`/cabinet/${record.agentId}`),
                      style: { cursor: 'pointer' },
                    })}
                  />
                </Card>

                <Card title="Динамика за 24 часа">
                  <Row gutter={[16, 16]}>
                    {timeseriesSummary.map((item) => {
                      const agent = agents.find((entry) => entry.id === item.agentId);
                      return (
                        <Col key={item.agentId} xs={24} lg={8}>
                          <Card size="small" title={agent?.name ?? item.agentId}>
                            <Space direction="vertical" size="small" style={{ width: '100%' }}>
                              {item.summary.map((metric) => (
                                <Typography.Text key={metric.metric}>
                                  {metric.metric}: min {metric.min ?? '—'} / max {metric.max ?? '—'} / текущее {metric.current ?? '—'}
                                </Typography.Text>
                              ))}
                              <Table
                                size="small"
                                rowKey="timestamp"
                                dataSource={item.latestPoints}
                                pagination={false}
                                columns={[
                                  {
                                    title: 'Время',
                                    key: 'timestamp',
                                    render: (_: unknown, record: DemoTimeseriesPoint) => dayjs(record.timestamp).format('HH:mm'),
                                  },
                                  {
                                    title: 'Значения',
                                    key: 'values',
                                    render: (_: unknown, record: DemoTimeseriesPoint) =>
                                      Object.entries(record.values)
                                        .map(([name, value]) => `${name}: ${value}`)
                                        .join(' · '),
                                  },
                                ]}
                              />
                            </Space>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </Card>
              </Space>
            ),
          },
          {
            key: 'assistants',
            label: 'Цифровые помощники',
            children: (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Table rowKey="id" dataSource={agentRows} columns={columns} pagination={false} />
                  <Typography.Text type="secondary">
                    Сортировка по числу событий, требующих внимания, в порядке убывания.
                  </Typography.Text>
                </Space>
              </Card>
            ),
          },
          {
            key: 'settings',
            label: 'Настройки',
            children: (
              <Card>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Typography.Text type="secondary">
                    Выберите помощника, чтобы открыть его параметры работы и пороги мониторинга.
                  </Typography.Text>
                  <Table rowKey="id" dataSource={agentRows} columns={settingsColumns} pagination={false} size="small" className="settings-table-compact" />
                </Space>
              </Card>
            ),
          },
        ]}
      />

      <Modal
        open={isModalOpen}
        title="Заявка на запуск цифрового помощника"
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setIsModalOpen(false);
            form.resetFields();
          }}>
            Отмена
          </Button>,
          <Button key="submit" type="primary" loading={isSubmitting} disabled={!isSubmitEnabled} onClick={handleSubmitRequest}>
            Отправить заявку
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="domain"
            label="Направление/домен"
            rules={[{ required: true, message: 'Выберите направление' }]}
          >
            <Select
              placeholder="Выберите направление"
              options={[
                { value: 'heat', label: 'Теплосети' },
                { value: 'air', label: 'Качество воздуха' },
                { value: 'noise', label: 'Шум' },
                { value: 'other', label: 'Другое' },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="assistantName"
            label="Название помощника"
            rules={[{ required: true, message: 'Укажите название помощника' }]}
          >
            <Input placeholder="Например: Заместитель по контролю аварий на магистралях" />
          </Form.Item>
          <Form.Item
            name="responsibilityZone"
            label="Зона ответственности"
            rules={[{ required: true, message: 'Укажите зону ответственности' }]}
          >
            <Input.TextArea placeholder="Район/объекты/контур ответственности" autoSize={{ minRows: 2, maxRows: 3 }} />
          </Form.Item>
          <Form.Item
            name="description"
            label="Описание задачи и ожидаемый результат"
            rules={[{ required: true, message: 'Опишите задачу и ожидаемый результат' }]}
          >
            <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} />
          </Form.Item>
          <Form.Item
            name="priority"
            label="Приоритет"
            rules={[{ required: true, message: 'Выберите приоритет' }]}
          >
            <Select
              placeholder="Выберите приоритет"
              options={[
                { value: 'low', label: 'Низкий' },
                { value: 'medium', label: 'Средний' },
                { value: 'high', label: 'Высокий' },
              ]}
            />
          </Form.Item>
          <Form.Item name="contact" label="Контакт для уточнений">
            <Input placeholder="Email / телефон" />
          </Form.Item>
        </Form>
      </Modal>

      <AgentSettingsModal
        open={Boolean(settingsAgentId)}
        agentId={settingsAgentId}
        settings={settingsAgentId ? getAgentSettings(settingsAgentId) : null}
        onClose={closeSettings}
      />
    </div>
  );
}

export default CabinetPage;
