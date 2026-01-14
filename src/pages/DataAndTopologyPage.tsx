import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Empty, Row, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { DeviationGetResponse, LogsGetResponse, NetworkResponse } from '../api/types';
import { fetchDeviations, fetchLogs, fetchNetworks } from '../api/client';
import { getSeverityMeta, SeverityLevel } from '../utils/severity';
import { YandexTopologyMap } from '../components/maps/YandexTopologyMap';
import { formatEdgeShortLabel, getDeviationTypeLabel } from '../utils/topologyLabels';

function DataAndTopologyPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogsGetResponse[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const [selectedLogNetworkId, setSelectedLogNetworkId] = useState<string | null>(null);
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingDeviations, setLoadingDeviations] = useState(false);
  const [selectedEdgeId, setSelectedEdgeId] = useState<number | null>(null);

  useEffect(() => {
    setLoadingNetworks(true);
    fetchNetworks()
      .then((data) => {
        setNetworks(data);
        if (data.length > 0) setSelectedNetworkId(data[0].id);
      })
      .catch(() => message.error('Не удалось загрузить список сетей'))
      .finally(() => setLoadingNetworks(false));
  }, []);

  useEffect(() => {
    setSelectedEdgeId(null);
    setSelectedLogId(null);
    setSelectedLogNetworkId(null);
    setDeviations([]);
    setLogs([]);
    if (!selectedNetworkId) return;
    setLoadingLogs(true);
    fetchLogs(selectedNetworkId)
      .then((logList) => {
        const sortedLogs = [...logList].sort(
          (a, b) => dayjs(b.timestamp).valueOf() - dayjs(a.timestamp).valueOf(),
        );
        setLogs(sortedLogs);
        if (sortedLogs.length > 0) {
          setSelectedLogId(sortedLogs[0].id);
          setSelectedLogNetworkId(selectedNetworkId);
        } else {
          setSelectedLogId(null);
          setSelectedLogNetworkId(null);
          setDeviations([]);
        }
      })
      .catch(() => message.error('Ошибка при загрузке журналов'))
      .finally(() => setLoadingLogs(false));
  }, [selectedNetworkId]);

  useEffect(() => {
    if (
      !selectedNetworkId ||
      selectedLogId == null ||
      selectedLogNetworkId !== selectedNetworkId
    )
      return;
    setLoadingDeviations(true);
    fetchDeviations(selectedNetworkId, selectedLogId)
      .then(setDeviations)
      .catch(() => message.error('Не удалось загрузить отклонения'))
      .finally(() => setLoadingDeviations(false));
  }, [selectedLogId, selectedLogNetworkId, selectedNetworkId]);

  const handleSelectLog = (logId: number | null) => {
    setSelectedLogId(logId);
    setSelectedLogNetworkId(logId == null ? null : selectedNetworkId);
  };

  const highlightStyles = useMemo(() => {
    const result: Record<number, { color?: string; width?: number; opacity?: number }> = {};
    deviations.forEach((dev) => {
      if (!dev.level) return;
      const meta = getSeverityMeta(dev.level as SeverityLevel);
      result[dev.edge_id] = { color: meta.color, width: 4, opacity: 0.85 };
    });
    return result;
  }, [deviations]);

  const filteredDeviations = useMemo(() => {
    if (selectedEdgeId == null) return deviations;
    return deviations.filter((d) => d.edge_id === selectedEdgeId);
  }, [deviations, selectedEdgeId]);

  const deviationColumns: ColumnsType<DeviationGetResponse> = [
    {
      title: 'Участок',
      dataIndex: 'edge_id',
      width: 140,
      render: (value: number) => formatEdgeShortLabel(value),
    },
    {
      title: 'Параметр',
      dataIndex: 'type',
      width: 180,
      render: (value: DeviationGetResponse['type']) => getDeviationTypeLabel(value),
    },
    {
      title: 'Факт',
      dataIndex: 'value',
      render: (v: number | null | undefined) => v ?? '—',
    },
    {
      title: 'Норма',
      dataIndex: 'reference',
      render: (v: number | null | undefined) => v ?? '—',
    },
    {
      title: 'Уровень',
      dataIndex: 'level',
      width: 140,
      render: (lvl: DeviationGetResponse['level']) => {
        const meta = getSeverityMeta(lvl ?? undefined);
        return <Tag color={meta.color}>{meta.tagText}</Tag>;
      },
    },
    {
      title: 'Регламент',
      dataIndex: 'regulation',
      render: (text: string | null) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '—'}</div>
      ),
    },
    {
      title: 'Рекомендация',
      dataIndex: 'recommendation',
      render: (text: string | null) => (
        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{text || '—'}</div>
      ),
    },
  ];

  const logColumns: ColumnsType<LogsGetResponse> = [
    {
      title: 'Дата и время',
      dataIndex: 'timestamp',
      render: (value: string) => dayjs(value).format('DD.MM.YYYY HH:mm:ss'),
    },
    {
      title: 'Действие',
      width: 140,
      render: (_, record) => (
        <a onClick={() => handleSelectLog(record.id)} role="button">
          Показать отклонения
        </a>
      ),
    },
  ];

  return (
    <div className="page-shell">
      <Typography.Title level={2} className="page-title" style={{ marginBottom: 8 }}>
        Топология и отклонения
      </Typography.Title>
      <section className="section-block">
        <Typography.Title level={3}>Источник данных: теплосеть</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ maxWidth: 900 }}>
          Сигма подключается к цифровой модели теплосети и получает от неё данные в режиме, близком к
          реальному времени. Выберите сеть, чтобы увидеть её схему и журнал отклонений.
        </Typography.Paragraph>
        <Row gutter={16} align="middle">
          <Col xs={24} sm={12} md={8} lg={6}>
            <Typography.Text strong>Выберите сеть</Typography.Text>
            <div className="field-stack">
              <Select
                loading={loadingNetworks}
                placeholder="Сеть"
                value={selectedNetworkId ?? undefined}
                style={{ width: '100%' }}
                options={networks.map((n) => ({ label: n.name, value: n.id }))}
                onChange={(val) => setSelectedNetworkId(val)}
              />
            </div>
          </Col>
          <Col xs={24} sm={12} md={16} lg={18}>
            <Typography.Paragraph>
              В пилотном примере Сигма работает с тепловой сетью города. Выше можно выбрать доступную сеть, далее
              показаны её карта и журнал отклонений.
            </Typography.Paragraph>
          </Col>
        </Row>
      </section>

      <section className="section-block">
        <Typography.Title level={4}>Карта и топология теплосети</Typography.Title>
        <Typography.Paragraph>
          На карте отображается реальная схема сети: точки — узлы (колодцы, камеры, насосные), линии — участки
          трубопроводов. Сигма рассчитывает по ним отклонения и подсвечивает проблемные участки.
        </Typography.Paragraph>
        <Card bodyStyle={{ padding: 12 }} className="soft-card">
          {selectedNetworkId ? (
            <YandexTopologyMap
              networkId={selectedNetworkId}
              height={440}
              highlightEdges={highlightStyles}
              selectedEdgeId={selectedEdgeId}
              onEdgeSelect={setSelectedEdgeId}
            />
          ) : (
            <Empty description="Выберите сеть" />
          )}
        </Card>
        <Typography.Paragraph style={{ marginTop: 8 }} type="secondary">
          Каждая точка — узел теплосети. Линии подсвечиваются по уровню критичности отклонений: красный — высокий,
          оранжевый — средний, жёлтый — низкий. Если отклонений нет, линия отображается синим цветом.
        </Typography.Paragraph>
      </section>

      <section className="section-block">
        <Typography.Title level={4}>Журнал отклонений</Typography.Title>
        <Typography.Paragraph>
          Сигма фиксирует отклонения параметров сети, присваивает им уровни критичности по цифровым регламентам и
          формирует рекомендации для диспетчерских служб.
        </Typography.Paragraph>
        <Row gutter={16}>
          <Col xs={24} md={10}>
            <Card title="Записи журнала" size="small">
              <Table
                rowKey="id"
                size="small"
                columns={logColumns}
                dataSource={logs}
                loading={loadingLogs}
                pagination={false}
                onRow={(record) => ({
                  onClick: () => handleSelectLog(record.id),
                  style: {
                    cursor: 'pointer',
                    background: selectedLogId === record.id ? 'rgba(47, 107, 255, 0.12)' : undefined,
                  },
                })}
              />
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card
              title={selectedLogId ? `Отклонения журнала #${selectedLogId}` : 'Отклонения'}
              size="small"
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {selectedEdgeId && (
                  <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                    <Typography.Text type="secondary">
                      Показаны отклонения по {formatEdgeShortLabel(selectedEdgeId)}. Нажмите по карте, чтобы
                      изменить выбор.
                    </Typography.Text>
                    <Button size="small" onClick={() => setSelectedEdgeId(null)}>
                      Сбросить выделение
                    </Button>
                  </Space>
                )}
                <Table
                  rowKey="id"
                  size="small"
                  loading={loadingDeviations}
                  columns={deviationColumns}
                  dataSource={filteredDeviations}
                  pagination={{ pageSize: 6 }}
                  onRow={(record) => ({
                    onClick: () => setSelectedEdgeId(record.edge_id),
                    style: {
                      cursor: 'pointer',
                      background: selectedEdgeId === record.edge_id ? 'rgba(255, 186, 65, 0.18)' : undefined,
                    },
                  })}
                />
              </Space>
            </Card>
          </Col>
        </Row>
        <Typography.Paragraph style={{ marginTop: 12 }} type="secondary">
          Цвет показывает уровень критичности отклонения. Регламенты задают пороги и правила, по которым система
          присваивает уровни и формирует рекомендации для диспетчерских служб.
        </Typography.Paragraph>
      </section>
    </div>
  );
}

export default DataAndTopologyPage;
