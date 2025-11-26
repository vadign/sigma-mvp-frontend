import { Layout, Menu, Typography, Space } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ReactNode, useMemo } from 'react';

const { Header, Content } = Layout;

interface MenuItem {
  key: string;
  label: ReactNode;
}

const menuItems: MenuItem[] = [
  { key: '/networks', label: <Link to="/networks">Сети</Link> },
  { key: '/users', label: <Link to="/users">Пользователи</Link> },
  { key: '/regulations', label: <Link to="/regulations">Регламенты</Link> },
  { key: '/admin', label: <Link to="/admin">Администрирование</Link> },
];

export default function AppLayout() {
  const location = useLocation();
  const selectedKeys = useMemo(() => {
    const found = menuItems.find((item) => location.pathname.startsWith(item.key));
    return found ? [found.key] : [];
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-shell__header">
        <Space size={20} align="center">
          <div className="brand-badge">Σ</div>
          <div>
            <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
              Sigma Мониторинг
            </Typography.Title>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.75)' }}>
              Единая панель наблюдения за сетями
            </Typography.Text>
          </div>
        </Space>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selectedKeys}
          items={menuItems.map((item) => ({ key: item.key, label: item.label }))}
        />
      </Header>
      <Content className="app-shell__content">
        <Outlet />
      </Content>
    </Layout>
  );
}
