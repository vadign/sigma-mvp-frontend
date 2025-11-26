import { Button, Card, Space, Typography, message } from 'antd';
import {
  clearDeviationsAdmin,
  clearTopologyAdmin,
  updateDeviationsAdmin,
  updateTopologyAdmin,
} from '../../api/admin';

async function call(action: () => Promise<void>) {
  try {
    await action();
    message.success('Request completed');
  } catch (err) {
    message.error((err as Error)?.message ?? 'Request failed');
  }
}

export default function AdminPage() {
  return (
    <div className="content-card" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <Card title="Topology">
        <Space direction="vertical">
          <Button type="primary" onClick={() => call(updateTopologyAdmin)}>
            Update topology
          </Button>
          <Button danger onClick={() => call(clearTopologyAdmin)}>
            Clear topology
          </Button>
        </Space>
      </Card>
      <Card title="Deviations">
        <Space direction="vertical">
          <Button type="primary" onClick={() => call(updateDeviationsAdmin)}>
            Update deviations
          </Button>
          <Button danger onClick={() => call(clearDeviationsAdmin)}>
            Clear deviations
          </Button>
        </Space>
      </Card>
      <Typography.Text type="secondary">
        Each action triggers the respective admin endpoint and shows success or error notifications.
      </Typography.Text>
    </div>
  );
}
