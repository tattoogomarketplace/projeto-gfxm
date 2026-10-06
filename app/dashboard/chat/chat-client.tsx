'use client';

import { ChatWorkspace } from '@/components/features/chat/chat-workspace';

export default function ChatClient() {
  return (
    <div className="min-h-0 flex-1 transform-gpu transition-opacity duration-200">
      <ChatWorkspace />
    </div>
  );
}
