import { Card, Space, Switch, Button, Typography } from 'antd';
import { useDemoData } from '../demo/demoState';

function DemoControlPanel() {
  const { controls } = useDemoData();

  return (
    <Card size="small">
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Typography.Text strong>Демо-контроль</Typography.Text>
        <Space wrap>
          <Space>
            <Typography.Text type="secondary">Симулировать отсутствие данных по шуму</Typography.Text>
            <Switch
              checked={controls.noiseDataMissing}
              onChange={controls.setNoiseDataMissing}
              size="small"
            />
          </Space>
          <Space>
            <Typography.Text type="secondary">Приостановить воздух</Typography.Text>
            <Switch
              checked={controls.airPaused}
              onChange={controls.setAirPaused}
              size="small"
            />
          </Space>
          <Button size="small" type="primary" onClick={controls.addCriticalHeatEvent}>
            Добавить критическое событие теплосетей сейчас
          </Button>
        </Space>
      </Space>
    </Card>
  );
}

export default DemoControlPanel;
