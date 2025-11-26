import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/Layout';
import NetworksPage from '../pages/Networks';
import NetworkDetailsPage from '../pages/NetworkDetails';
import UsersPage from '../pages/Users';
import UserDetailsPage from '../pages/UserDetails';
import RegulationsPage from '../pages/Regulations';
import AdminPage from '../pages/Admin';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/networks" replace /> },
      { path: '/networks', element: <NetworksPage /> },
      { path: '/networks/:networkId', element: <NetworkDetailsPage /> },
      { path: '/users', element: <UsersPage /> },
      { path: '/users/:userId', element: <UserDetailsPage /> },
      { path: '/regulations', element: <RegulationsPage /> },
      { path: '/admin', element: <AdminPage /> },
    ],
  },
]);

export default router;
