import { Layout, Menu, Typography } from 'antd';
import {
  InfoCircleOutlined,
  ApartmentOutlined,
  FileProtectOutlined,
  CrownOutlined,
  NotificationOutlined,
  InteractionOutlined,
  UserOutlined,
  CodeOutlined,
} from '@ant-design/icons';
import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { DemoDataProvider } from './demo/demoState';
import IntroPage from './pages/IntroPage';
import DataAndTopologyPage from './pages/DataAndTopologyPage';
import RegulationsPage from './pages/RegulationsPage';
import MayorDashboardPage from './pages/MayorDashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import ScenarioPage from './pages/ScenarioPage';
import CabinetPage from './pages/CabinetPage';
import AgentPage from './pages/AgentPage';
import DevCabinetPage from './pages/DevCabinetPage';
import ChatWidget from './components/chat/ChatWidget';

const { Header, Content } = Layout;

const tabs = [
  { key: 'cabinet', label: 'Личный кабинет', icon: <UserOutlined />, path: '/cabinet' },
  { key: 'intro', label: 'Вступление', icon: <InfoCircleOutlined />, path: '/intro', hidden: true },
  { key: 'topology', label: 'Топология и отклонения', icon: <ApartmentOutlined />, path: '/topology' },
  { key: 'regulations', label: 'Регламенты', icon: <FileProtectOutlined />, path: '/regulations' },
  { key: 'mayor', label: 'Дашборд мэра', icon: <CrownOutlined />, path: '/mayor' },
  { key: 'notifications', label: 'Уведомления', icon: <NotificationOutlined />, path: '/notifications' },
  { key: 'scenario', label: 'Сквозной кейс', icon: <InteractionOutlined />, path: '/scenario' },
  { key: 'dev-cabinet', label: 'Кабинет разработчика', icon: <CodeOutlined />, path: '/dev-cabinet' },
];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const visibleTabs = useMemo(() => tabs.filter((tab) => !tab.hidden), []);

  const activeKey = useMemo(() => {
    const path = location.pathname;
    const match = tabs.find((tab) => path === tab.path || path.startsWith(`${tab.path}/`));
    return match?.key ?? 'cabinet';
  }, [location.pathname]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="app-brand">
          <div className="app-logo">
            <span className="app-logo-symbol">Σ</span>
          </div>
          <div>
            <Typography.Text className="app-title">Сигма</Typography.Text>
            <Typography.Text className="app-subtitle">демонстрация возможностей</Typography.Text>
          </div>
        </div>
        <Menu
          mode="horizontal"
          selectedKeys={[activeKey]}
          onClick={(e) => {
            const target = visibleTabs.find((tab) => tab.key === e.key);
            if (target) navigate(target.path);
          }}
          items={visibleTabs.map(({ key, label, icon }) => ({ key, label, icon }))}
          className="app-menu"
        />
      </Header>
      <Content className="app-content">
        <Routes>
          <Route path="/" element={<Navigate to="/cabinet" replace />} />
          <Route path="/cabinet" element={<CabinetPage />} />
          <Route path="/cabinet/:agentId" element={<AgentPage />} />
          <Route path="/intro" element={<IntroPage />} />
          <Route path="/topology" element={<DataAndTopologyPage />} />
          <Route path="/regulations" element={<RegulationsPage />} />
          <Route path="/mayor" element={<MayorDashboardPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/scenario" element={<ScenarioPage />} />
          <Route path="/dev-cabinet" element={<DevCabinetPage />} />
          <Route path="*" element={<Navigate to="/cabinet" replace />} />
        </Routes>
      </Content>
      <ChatWidget />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <DemoDataProvider>
        <AppLayout />
      </DemoDataProvider>
    </BrowserRouter>
  );
}

export default App;
