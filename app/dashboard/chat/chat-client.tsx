'use client';

import { Suspense } from 'react';
import { ChatWorkspace } from '@/components/features/chat/chat-workspace';
import { Skeleton } from '@/components/ui/skeleton';

function ChatFallback() {
  return (
    <div className="pt-3">
      <Skeleton className="h-[28rem] w-full rounded-2xl" />
    </div>
  );
}

export default function ChatClient() {
  return (
    <Suspense fallback={<ChatFallback />}>
      <ChatWorkspace />
    </Suspense>
  );
}
