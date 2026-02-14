'use client';

import DashboardLayout from '@/components/layouts/DashboardLayout';
import ChatMessages from '@/components/chat/ChatMessages';

export default function ChatPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">
            Get personalized financial advice and insights
          </p>
        </div>
        <ChatMessages />
      </div>
    </DashboardLayout>
  );
}
