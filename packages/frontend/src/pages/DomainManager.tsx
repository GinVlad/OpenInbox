import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDomains, createDomain, updateDomain, deleteDomain } from '../lib/api';
import toast from 'react-hot-toast';

export default function DomainManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: domains, isLoading, isError, error } = useQuery({ queryKey: ['domains'], queryFn: () => getDomains() });

  const createMutation = useMutation({
    mutationFn: () => createDomain(newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Domain added');
      setNewName('');
    },
    onError: (err: any) => toast.error(err.response?.data?.error ?? 'Failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: number }) => updateDomain(id, enabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDomain,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['inboxes'] });
      toast.success('Domain deleted');
    },
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError) return <p className="text-red-500">Error: {(error as any)?.message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Domains</h1>

      <div className="flex gap-2 mb-6">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value.toLowerCase())}
          placeholder="example.com"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
        />
        <button
          onClick={() => createMutation.mutate()}
          disabled={!newName || createMutation.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <div className="bg-white rounded-lg shadow">
        {(domains ?? []).length === 0 ? (
          <p className="p-4 text-gray-500">No domains yet. Add your EMAIL_DOMAIN first.</p>
        ) : (
          <ul>
            {(domains ?? []).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${d.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="font-mono">{d.name}</span>
                  <span className="text-xs text-gray-400">{d.enabled ? 'Active' : 'Disabled'}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMutation.mutate({ id: d.id, enabled: d.enabled ? 0 : 1 })}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {d.enabled ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete domain "${d.name}" and all inboxes?`)) deleteMutation.mutate(d.id);
                    }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
