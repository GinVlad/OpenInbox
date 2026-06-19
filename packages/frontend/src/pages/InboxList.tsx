import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getInboxes, getDomains, createInbox, deleteInbox } from '../lib/api';
import toast from 'react-hot-toast';

export default function InboxList() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [domainId, setDomainId] = useState('');

  const { data: inboxes, isLoading } = useQuery({ queryKey: ['inboxes'], queryFn: () => getInboxes() });
  const { data: domains } = useQuery({ queryKey: ['domains'], queryFn: getDomains });

  const createMutation = useMutation({
    mutationFn: () => createInbox(name, domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Inbox created');
      setName('');
      setShowCreate(false);
    },
    onError: () => toast.error('Failed to create inbox'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInbox,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Inbox deleted');
    },
    onError: () => toast.error('Failed to delete inbox'),
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Inboxes</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700"
        >
          + New Inbox
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-4 mb-4 space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="inbox name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select a domain</option>
            {(domains ?? []).filter((d) => d.enabled === 1).map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!name || !domainId || createMutation.isPending}
              className="bg-green-600 text-white px-3 py-1.5 rounded-md text-sm disabled:opacity-50"
            >
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="text-gray-500 text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {(inboxes ?? []).length === 0 ? (
          <p className="p-4 text-gray-500">No inboxes yet.</p>
        ) : (
          <ul>
            {(inboxes ?? []).map((inbox) => (
              <li key={inbox.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                <Link to={`/inboxes/${inbox.id}`} className="text-blue-600 font-mono hover:underline">
                  {inbox.full_email}
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Delete this inbox and all messages?')) deleteMutation.mutate(inbox.id);
                  }}
                  className="text-red-500 text-sm hover:underline"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
