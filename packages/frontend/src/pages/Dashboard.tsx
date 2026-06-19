import { useQuery } from '@tanstack/react-query';
import { getInboxes, getDomains, getInboxMessages } from '../lib/api';

export default function Dashboard() {
  const { data: inboxes } = useQuery({ queryKey: ['inboxes'], queryFn: () => getInboxes() });
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: () => getDomains() });

  const { data: unreadCount } = useQuery({
    queryKey: ['unread'],
    queryFn: async () => {
      const all = await getInboxes();
      let count = 0;
      for (const inbox of all) {
        const res = await getInboxMessages(inbox.id, null, 100);
        count += (res.data ?? []).filter((m) => m.is_read === 0).length;
      }
      return count;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Inboxes" value={inboxes?.length ?? '-'} />
        <StatCard label="Unread Messages" value={unreadCount ?? '-'} />
        <StatCard label="Domains" value={domains?.length ?? '-'} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
}
