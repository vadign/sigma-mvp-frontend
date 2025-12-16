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
import OperatorDashboardPage from './pages/OperatorDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import ScenarioPage from './pages/ScenarioPage';

const { Header, Content } = Layout;

const tabs = [
  { key: 'intro', label: 'Вступление', icon: <InfoCircleOutlined /> },
  { key: 'topology', label: 'Топология и отклонения', icon: <ApartmentOutlined /> },
  { key: 'regulations', label: 'Регламенты', icon: <FileProtectOutlined /> },
  { key: 'mayor', label: 'Дашборд мэра', icon: <CrownOutlined /> },
  { key: 'operator', label: 'Дашборд оператора', icon: <DashboardOutlined /> },
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
      case 'operator':
        return <OperatorDashboardPage />;
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
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: '0 16px 0 0' }}>
          Сигма — демонстрация возможностей
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          items={tabs}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: 24 }}>{content}</Content>
    </Layout>
  );
}

export default App;
