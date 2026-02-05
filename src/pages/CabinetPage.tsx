import { useMemo, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useDemoData } from '../demo/demoState';
import { createRequest, DevRequestDomain, DevRequestPriority } from '../features/devRequests/store';
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

interface RequestFormValues {
  domain: DevRequestDomain;
  assistantName: string;
  responsibilityZone: string;
  description: string;
  priority: DevRequestPriority;
  contact?: string;
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
  const [form] = Form.useForm<RequestFormValues>();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { agents, events } = useDemoData();
  const formValues = Form.useWatch([], form);

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
      <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
        <div>
          <Typography.Title level={3} className="page-title">
            Личный кабинет
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            Реестр цифровых заместителей по ключевым направлениям с актуальным статусом и числом событий.
          </Typography.Paragraph>
        </div>
        <Button type="primary" onClick={() => setIsModalOpen(true)}>
          Запросить нового цифрового помощника
        </Button>
      </Space>

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
    </div>
  );
}

export default CabinetPage;
