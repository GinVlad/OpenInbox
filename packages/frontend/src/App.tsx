import { Routes, Route, Navigate } from 'react-router-dom';
import PasswordGate from './components/PasswordGate';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import InboxList from './pages/InboxList';
import InboxDetail from './pages/InboxDetail';
import MessageViewer from './pages/MessageViewer';
import DomainManager from './pages/DomainManager';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PasswordGate />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inboxes" element={<InboxList />} />
          <Route path="/inboxes/:id" element={<InboxDetail />} />
          <Route path="/messages/:id" element={<MessageViewer />} />
          <Route path="/domains" element={<DomainManager />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
