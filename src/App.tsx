import { Layout, Menu, Typography } from 'antd';
import {
  InfoCircleOutlined,
  ApartmentOutlined,
  FileProtectOutlined,
  CrownOutlined,
  DashboardOutlined,
  NotificationOutlined,
  InteractionOutlined,
} from '@ant-design/icons';
import { useMemo, useState } from 'react';
import IntroPage from './pages/IntroPage';
import DataAndTopologyPage from './pages/DataAndTopologyPage';
import RegulationsPage from './pages/RegulationsPage';
import MayorDashboardPage from './pages/MayorDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import ScenarioPage from './pages/ScenarioPage';

const { Header, Content } = Layout;

const tabs = [
  { key: 'intro', label: 'Вступление', icon: <InfoCircleOutlined /> },
  { key: 'topology', label: 'Топология и отклонения', icon: <ApartmentOutlined /> },
  { key: 'regulations', label: 'Регламенты', icon: <FileProtectOutlined /> },
  { key: 'mayor', label: 'Дашборд мэра', icon: <CrownOutlined /> },
  { key: 'notifications', label: 'Уведомления', icon: <NotificationOutlined /> },
  { key: 'scenario', label: 'Сквозной кейс', icon: <InteractionOutlined /> },
];

function App() {
  const [activeKey, setActiveKey] = useState<string>('intro');

  const content = useMemo(() => {
    switch (activeKey) {
      case 'topology':
        return <DataAndTopologyPage />;
      case 'regulations':
        return <RegulationsPage />;
      case 'mayor':
        return <MayorDashboardPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'scenario':
        return <ScenarioPage />;
      case 'intro':
      default:
        return <IntroPage />;
    }
  }, [activeKey]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-brand">
          <div className="app-logo">Σ</div>
          <div>
            <Typography.Text className="app-title">Сигма</Typography.Text>
            <Typography.Text className="app-subtitle">демонстрация возможностей</Typography.Text>
          </div>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          items={tabs}
          className="app-menu"
        />
      </Header>
      <Content className="app-content">{content}</Content>
    </Layout>
  );
}

export default App;
