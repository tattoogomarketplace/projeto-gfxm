'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';

export default function ChatClient() {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col transform-gpu transition-opacity duration-200">
      <ChatWorkspace />
    </div>
  );
}
