import { useState, useEffect, useRef } from "react";
import type { ChatMsg } from "../types";

const MESSAGES_KEY = "cliq_messages";
const COUNTER_KEY = "cliq_msg_id_counter";

export function useMessages() {
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const saved = localStorage.getItem(MESSAGES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const idRef = useRef((() => {
    try {
      const saved = localStorage.getItem(COUNTER_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  })());

  const mkId = () => {
    const next = idRef.current + 1;
    idRef.current = next;
    localStorage.setItem(COUNTER_KEY, String(next));
    return `m${next}`;
  };

  useEffect(() => {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  const clearMessages = () => {
    setMessages([]);
    localStorage.removeItem(MESSAGES_KEY);
    localStorage.removeItem(COUNTER_KEY);
  };

  return { messages, setMessages, mkId, clearMessages };
}
