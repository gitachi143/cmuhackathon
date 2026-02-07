import { useState, useCallback } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import FollowUpChips from './FollowUpChips';
import { searchProducts } from '../api';
import { useUserProfile } from '../context/UserProfileContext';
import type { ChatMessage, Product, FollowUpQuestion } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  onProductsReceived: (products: Product[]) => void;
}

export default function ChatPanel({ messages, setMessages, onProductsReceived }: ChatPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpQuestion | null>(null);
  const { profile } = useUserProfile();

  const sendMessage = useCallback(
    async (query: string) => {
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setFollowUp(null);
      setIsLoading(true);

      try {
        // Build conversation history from previous messages
        const history = messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({ role: m.role, content: m.content }));

        const response = await searchProducts(query, profile, history);

        const agentMsg: ChatMessage = {
          id: `agent-${Date.now()}`,
          role: 'agent',
          content: response.agent_message,
          products: response.products,
          follow_up_question: response.follow_up_question,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);

        if (response.products.length > 0) {
          onProductsReceived(response.products);
        }
        if (response.follow_up_question) {
          setFollowUp(response.follow_up_question);
        }
      } catch (error) {
        console.error('Search error:', error);
        const errorMsg: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'agent',
          content: "Sorry, I had trouble processing that request. Could you try rephrasing what you're looking for?",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, profile, onProductsReceived, setMessages]
  );

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading} />
      {followUp && <FollowUpChips question={followUp} onSelect={(option) => sendMessage(option)} />}
      <MessageInput onSend={sendMessage} disabled={isLoading} />
    </div>
  );
}
