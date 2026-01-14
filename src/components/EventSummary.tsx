import { Space, Typography } from 'antd';
import { ReactNode } from 'react';
import { NetworkResponse } from '../api/types';
import LevelTag from './LevelTag';
import {
  formatEdgeShortLabel,
  formatNodeLabel,
  getDeviationTypeLabel,
} from '../utils/topologyLabels';

interface Props {
  msg: Record<string, any>;
  networks?: NetworkResponse[];
  showLevel?: boolean;
}

const resolveNetworkName = (networkId: string | undefined, networks?: NetworkResponse[]) => {
  if (!networkId) return null;
  const match = networks?.find((network) => network.id === networkId);
  return match?.name ?? networkId;
};

function EventSummary({ msg, networks, showLevel = true }: Props) {
  const entries: Array<{ label: string; value: ReactNode }> = [];
  const description = msg?.description || msg?.title || msg?.msg;

  if (description) {
    entries.push({ label: 'Описание', value: description });
  }

  if (showLevel && msg?.level) {
    entries.push({ label: 'Критичность', value: <LevelTag level={msg.level} /> });
  }

  if (msg?.network_id) {
    entries.push({ label: 'Сеть', value: resolveNetworkName(msg.network_id, networks) ?? '—' });
  }

  if (typeof msg?.edge_id === 'number') {
    entries.push({ label: 'Участок трубы', value: formatEdgeShortLabel(msg.edge_id) });
  }

  if (typeof msg?.node_id === 'number') {
    entries.push({ label: 'Узел', value: formatNodeLabel(msg.node_id) });
  }

  if (msg?.subsystem) {
    entries.push({ label: 'Подсистема', value: msg.subsystem });
  }

  if (msg?.type) {
    entries.push({ label: 'Параметр', value: getDeviationTypeLabel(msg.type) });
  }

  if (msg?.value != null) {
    entries.push({ label: 'Факт', value: msg.value });
  }

  if (msg?.reference != null) {
    entries.push({ label: 'Норма', value: msg.reference });
  }

  if (msg?.regulation) {
    entries.push({ label: 'Регламент', value: msg.regulation });
  }

  if (msg?.recommendation) {
    entries.push({ label: 'Рекомендация', value: msg.recommendation });
  }

  if (entries.length === 0) {
    return <Typography.Text type="secondary">Описание недоступно.</Typography.Text>;
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      {entries.map((entry) => (
        <Typography.Text key={entry.label}>
          <strong>{entry.label}:</strong> {entry.value}
        </Typography.Text>
      ))}
    </Space>
  );
}

export default EventSummary;
