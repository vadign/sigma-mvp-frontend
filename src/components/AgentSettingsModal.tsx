import { useEffect, useMemo, useState } from 'react';
import { Button, Checkbox, Input, InputNumber, Modal, Select, Space, Switch, Tabs, Typography, message } from 'antd';
import { AgentId } from '../utils/agents';
import { AGENT_DOMAIN_LABELS } from '../features/agentSettings/regulations';
import { AgentSettings, AgentSettingsPatch, DecisionMode, SeverityKey, resetAgentSettings, updateAgentSettings } from '../features/agentSettings/store';
import AgentRegulationsPanel from './AgentRegulationsPanel';

const DECISION_MODE_OPTIONS = [
  { value: 'recommend', label: 'Рекомендовать' },
  { value: 'confirm', label: 'Действовать с подтверждением' },
  { value: 'auto', label: 'Автономно' },
] as const;

interface AgentSettingsModalProps {
  open: boolean;
  agentId: AgentId | null;
  settings: AgentSettings | null;
  onClose: () => void;
}

const RECIPIENT_OPTIONS: Record<AgentId, string[]> = {
  heat: ['Диспетчер', 'Руководитель смены'],
  air: ['Эколог дежурный', 'Руководитель смены'],
  noise: ['Диспетчер', 'Руководитель смены'],
};

const SEVERITY_LABELS: Record<SeverityKey, string> = {
  low: 'Низкая',
  medium: 'Средняя',
  high: 'Высокая',
  critical: 'Критическая',
};

function AgentSettingsModal({ open, agentId, settings, onClose }: AgentSettingsModalProps) {
  const [draft, setDraft] = useState<AgentSettings | null>(settings);

  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  const hasChanges = useMemo(() => JSON.stringify(draft) !== JSON.stringify(settings), [draft, settings]);

  const updateDraft = (patch: AgentSettingsPatch) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...patch,
        notificationChannels: { ...prev.notificationChannels, ...(patch.notificationChannels ?? {}) },
        regulationsOverrides: { ...(prev.regulationsOverrides ?? {}), ...(patch.regulationsOverrides ?? {}) },
        decisionModesBySeverity: {
          ...prev.decisionModesBySeverity,
          ...(patch.decisionModesBySeverity ?? {}),
        },
      };
    });
  };

  const handleSave = () => {
    if (!draft || !agentId) return;
    updateAgentSettings(agentId, draft);
    message.success('Настройки сохранены');
    onClose();
  };

  const handleReset = () => {
    if (!agentId) return;
    Modal.confirm({
      title: 'Сбросить настройки помощника?',
      content: 'Все параметры будут возвращены к значениям по умолчанию.',
      okText: 'Сбросить',
      cancelText: 'Отмена',
      onOk: () => {
        const reset = resetAgentSettings(agentId);
        setDraft(reset);
        message.success('Настройки сброшены');
      },
    });
  };

  return (
    <Modal
      open={open}
      width={980}
      destroyOnClose={false}
      onCancel={onClose}
      title={
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{`Настройки: ${agentId ? AGENT_DOMAIN_LABELS[agentId] : 'Помощник'}`}</Typography.Text>
          {agentId ? <Typography.Text type="secondary">{`Домен: ${AGENT_DOMAIN_LABELS[agentId]}`}</Typography.Text> : null}
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>
          Отмена
        </Button>,
        <Button key="save" type="primary" disabled={!hasChanges || !draft} onClick={handleSave}>
          Сохранить
        </Button>,
      ]}
    >
      {draft && agentId ? (
        <Tabs
          items={[
            {
              key: 'regulations',
              label: 'Регламенты',
              children: <AgentRegulationsPanel agentId={agentId} />,
            },
            {
              key: 'autonomy',
              label: 'Автономность',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="large">
                  <Space align="center">
                    <Typography.Text>Помощник активен</Typography.Text>
                    <Switch checked={!draft.isPaused} onChange={(value) => updateDraft({ isPaused: !value })} />
                  </Space>
                  <div>
                    <Typography.Text>Режим принятия решений</Typography.Text>
                    <Select
                      value={draft.decisionMode}
                      options={DECISION_MODE_OPTIONS as unknown as { value: DecisionMode; label: string }[]}
                      style={{ width: '100%', marginTop: 8 }}
                      onChange={(value) => updateDraft({ decisionMode: value })}
                    />
                  </div>
                  <div>
                    <Typography.Text strong>Маппинг по критичности</Typography.Text>
                    <Space direction="vertical" style={{ width: '100%', marginTop: 8 }}>
                      {(Object.keys(SEVERITY_LABELS) as SeverityKey[]).map((severity) => (
                        <Space key={severity} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <Typography.Text>{SEVERITY_LABELS[severity]}</Typography.Text>
                          <Select
                            value={draft.decisionModesBySeverity?.[severity]}
                            options={DECISION_MODE_OPTIONS as unknown as { value: DecisionMode; label: string }[]}
                            style={{ width: 260 }}
                            onChange={(value) =>
                              updateDraft({
                                decisionModesBySeverity: {
                                  ...(draft.decisionModesBySeverity ?? {}),
                                  [severity]: value,
                                },
                              })
                            }
                          />
                        </Space>
                      ))}
                    </Space>
                  </div>
                </Space>
              ),
            },
            {
              key: 'notifications',
              label: 'Уведомления',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Space align="center">
                    <Typography.Text>Уведомления включены</Typography.Text>
                    <Switch checked={draft.notificationsEnabled} onChange={(value) => updateDraft({ notificationsEnabled: value })} />
                  </Space>
                  <Checkbox checked={draft.notificationChannels.inApp} onChange={(e) => updateDraft({ notificationChannels: { inApp: e.target.checked } })}>
                    В приложении
                  </Checkbox>
                  <Checkbox checked={draft.notificationChannels.email} onChange={(e) => updateDraft({ notificationChannels: { email: e.target.checked } })}>
                    Email (демо)
                  </Checkbox>
                  <Checkbox checked={draft.notificationChannels.sms} onChange={(e) => updateDraft({ notificationChannels: { sms: e.target.checked } })}>
                    SMS (демо)
                  </Checkbox>
                  <div>
                    <Typography.Text>Получатели/роль</Typography.Text>
                    <Select
                      mode="multiple"
                      allowClear
                      style={{ width: '100%', marginTop: 8 }}
                      value={draft.notificationRecipients}
                      options={RECIPIENT_OPTIONS[agentId].map((recipient) => ({ value: recipient, label: recipient }))}
                      onChange={(value) => updateDraft({ notificationRecipients: value })}
                    />
                  </div>
                </Space>
              ),
            },
            {
              key: 'data-thresholds',
              label: 'Данные и пороги',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <div>
                    <Typography.Text>Нет данных более N минут</Typography.Text>
                    <InputNumber
                      min={1}
                      value={draft.noDataThresholdMinutes}
                      style={{ marginTop: 8, width: '100%' }}
                      onChange={(value) => {
                        if (typeof value === 'number' && Number.isFinite(value)) {
                          updateDraft({ noDataThresholdMinutes: value });
                        }
                      }}
                    />
                  </div>
                  <Typography.Text type="secondary">
                    Статус «Не получает данные» в личном кабинете рассчитывается по этому порогу.
                  </Typography.Text>
                </Space>
              ),
            },
            {
              key: 'service',
              label: 'Служебное',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Input
                    placeholder="Ответственный владелец"
                    value={draft.owner}
                    onChange={(event) => updateDraft({ owner: event.target.value })}
                  />
                  <Input.TextArea
                    placeholder="Комментарий к настройкам"
                    value={draft.comment}
                    onChange={(event) => updateDraft({ comment: event.target.value })}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                  />
                  <Button danger onClick={handleReset}>
                    Сбросить настройки помощника
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      ) : null}
    </Modal>
  );
}

export default AgentSettingsModal;
