import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInboxMessages, getInboxes, deleteMessage, updateMessageRead, type Message } from '../lib/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function InboxDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: inboxes } = useQuery({ queryKey: ['inboxes'], queryFn: () => getInboxes() });
  const inbox = inboxes?.find((i) => i.id === id);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => getInboxMessages(id!, null, 100),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      toast.success('Message deleted');
    },
  });

  const toggleReadMutation = useMutation({
    mutationFn: ({ msgId, isRead }: { msgId: string; isRead: number }) => updateMessageRead(msgId, isRead),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['messages', id] }),
  });

  const allMessages = data?.data ?? [];

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (isError) return <p className="text-red-500">Error: {(error as any)?.message}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{inbox?.full_email ?? id}</h1>
      {allMessages.length === 0 ? (
        <p className="text-gray-500">No messages yet.</p>
      ) : (
        <div className="space-y-2 mt-4">
          {allMessages.map((msg) => (
            <MessageRow
              key={msg.id}
              message={msg}
              onDelete={() => deleteMutation.mutate(msg.id)}
              onToggleRead={() => toggleReadMutation.mutate({ msgId: msg.id, isRead: msg.is_read ? 0 : 1 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MessageRow({
  message,
  onDelete,
  onToggleRead,
}: {
  message: Message;
  onDelete: () => void;
  onToggleRead: () => void;
}) {
  return (
    <div className={`bg-white rounded shadow p-4 flex items-center justify-between ${message.is_read ? 'opacity-60' : ''}`}>
      <Link to={`/messages/${message.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {message.is_read === 0 && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
          <span className="font-medium truncate">{message.sender}</span>
        </div>
        <p className="text-sm text-gray-600 truncate">{message.subject || '(no subject)'}</p>
        <p className="text-xs text-gray-400 mt-1">
          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
        </p>
      </Link>
      <div className="flex items-center gap-2 ml-4">
        <button onClick={onToggleRead} className="text-xs text-blue-500 hover:underline">
          {message.is_read ? 'Unread' : 'Read'}
        </button>
        <button onClick={onDelete} className="text-xs text-red-500 hover:underline">Delete</button>
      </div>
    </div>
  );
}
