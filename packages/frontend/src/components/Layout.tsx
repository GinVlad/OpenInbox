import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/inboxes', label: 'Inboxes' },
  { to: '/domains', label: 'Domains' },
];

export default function Layout() {
  const navigate = useNavigate();

  async function handleLogout() {
    await axios.post('/api/auth/logout', {}, { withCredentials: true });
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex h-screen">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-6 text-lg font-bold tracking-wide border-b border-gray-700">
          OpenInbox
        </div>
        <nav className="flex-1 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-4 py-2 text-sm ${isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full text-left text-sm text-gray-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
