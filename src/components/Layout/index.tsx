import { Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ReactNode, useMemo } from 'react';

const { Header, Content } = Layout;

interface MenuItem {
  key: string;
  label: ReactNode;
}

const menuItems: MenuItem[] = [
  { key: '/networks', label: <Link to="/networks">Networks</Link> },
  { key: '/users', label: <Link to="/users">Users</Link> },
  { key: '/regulations', label: <Link to="/regulations">Regulations</Link> },
  { key: '/admin', label: <Link to="/admin">Admin</Link> },
];

export default function AppLayout() {
  const location = useLocation();
  const selectedKeys = useMemo(() => {
    const found = menuItems.find((item) => location.pathname.startsWith(item.key));
    return found ? [found.key] : [];
  }, [location.pathname]);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>
          Sigma Monitoring
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={selectedKeys}
          items={menuItems.map((item) => ({ key: item.key, label: item.label }))}
        />
      </Header>
      <Content style={{ padding: '24px' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
