import { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Typography, message } from 'antd';
import LevelTag from '../components/LevelTag';
import { fetchDeviations, fetchLogs, fetchNetworks, updateDeviations } from '../api/client';
import { DeviationGetResponse, NetworkResponse } from '../api/types';
function ScenarioPage() {
  const [networks, setNetworks] = useState<NetworkResponse[]>([]);
  const [networkId, setNetworkId] = useState<string | undefined>();
  const [deviations, setDeviations] = useState<DeviationGetResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNetworks()
      .then((list) => {
        setNetworks(list);
        if (list.length > 0) setNetworkId(list[0].id);
      })
      .catch(() => message.error('Не удалось загрузить сети'));
  }, []);

  const runScenario = async () => {
    if (!networkId) return;
    setLoading(true);
    try {
      await updateDeviations();
      const logs = await fetchLogs(networkId);
      if (logs.length > 0) {
        const lastLog = logs[0];
        const devs = await fetchDeviations(networkId, lastLog.id);
        setDeviations(devs);
      }
      message.success('Сценарий обновлён');
    } catch (e) {
      message.error('Не удалось выполнить сценарий');
    } finally {
      setLoading(false);
    }
  };

        <Col span={24}>
                  <li key={d.id}>
            ) : (
            {networkId ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <YandexTopologyMap
                  networkId={networkId}
                  height={360}
                  highlightEdges={highlightStyles}
                  selectedEdgeId={selectedEdgeId}
                  onEdgeSelect={setSelectedEdgeId}
                />
                <Typography.Text type="secondary">
                  Топология подтягивается из API сети. Нажмите на ребро, чтобы увидеть показатели и выделить его в
                  списке отклонений.
                </Typography.Text>
              </Space>
            ) : (
              <Typography.Text>Загрузка топологии...</Typography.Text>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default ScenarioPage;
