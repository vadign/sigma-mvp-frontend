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
    message.success('Запрос выполнен');
  } catch (err) {
    message.error((err as Error)?.message ?? 'Ошибка запроса');
  }
}

export default function AdminPage() {
  return (
    <div className="content-card" style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <Card title="Топология">
        <Space direction="vertical">
          <Button type="primary" onClick={() => call(updateTopologyAdmin)}>
            Обновить топологию
          </Button>
          <Button danger onClick={() => call(clearTopologyAdmin)}>
            Очистить топологию
          </Button>
        </Space>
      </Card>
      <Card title="Отклонения">
        <Space direction="vertical">
          <Button type="primary" onClick={() => call(updateDeviationsAdmin)}>
            Обновить отклонения
          </Button>
          <Button danger onClick={() => call(clearDeviationsAdmin)}>
            Очистить отклонения
          </Button>
        </Space>
      </Card>
      <Typography.Text type="secondary">
        Каждое действие вызывает соответствующий админский эндпоинт и показывает уведомление об успехе или ошибке.
      </Typography.Text>
    </div>
  );
}
