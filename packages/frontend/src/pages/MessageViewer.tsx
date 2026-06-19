import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMessage, getInboxes, deleteMessage, updateMessageRead } from '../lib/api';
import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function MessageViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showHtml, setShowHtml] = useState(false);

  const { data: message, isLoading, isError } = useQuery({
    queryKey: ['message', id],
    queryFn: () => getMessage(id!),
    enabled: !!id,
  });

  const { data: inboxes } = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => getInboxes(),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMessage(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message deleted');
      if (message) navigate(`/inboxes/${message.inbox_id}`);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const markReadMutation = useMutation({
    mutationFn: () => updateMessageRead(id!, 1),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['message', id] }),
  });

  if (isLoading) return <p className="p-6 text-gray-500">Loading...</p>;
  if (isError || !message) return <p className="p-6 text-red-500">Message not found.</p>;

  const inbox = inboxes?.find((i) => i.id === message?.inbox_id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link to={`/inboxes/${message.inbox_id}`} className="text-blue-600 hover:underline text-sm">
          &larr; Back to {inbox?.full_email ?? 'inbox'}
        </Link>
        <button
          onClick={() => { if (confirm('Delete this message?')) deleteMutation.mutate(); }}
          className="text-red-500 text-sm hover:underline"
        >
          Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-xl font-bold break-words">{message.subject || '(no subject)'}</h1>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
          <span><strong>From:</strong> {message.sender}</span>
          <span><strong>To:</strong> {message.recipient}</span>
          <span>{format(new Date(message.created_at), 'PPpp')}</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowHtml(false)}
            className={`px-3 py-1 text-sm rounded ${!showHtml ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            Text
          </button>
          {message.html_body && (
            <button
              onClick={() => {
                setShowHtml(true);
                if (message.is_read === 0) markReadMutation.mutate();
              }}
              className={`px-3 py-1 text-sm rounded ${showHtml ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
            >
              HTML
            </button>
          )}
        </div>

        <div className="mt-4 border-t pt-4">
          {showHtml && message.html_body ? (
            <iframe
              title="Email HTML preview"
              sandbox=""
              srcDoc={message.html_body}
              className="w-full h-[600px] border rounded bg-white"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-sans text-sm break-words">
              {message.text_body?.trim() || '(empty body)'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
