import { Button, Input, Typography } from 'antd';
import { CloseOutlined, MessageOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

const { Text } = Typography;

const BOT_REPLY = 'Я скоро начну работать!';

type ChatRole = 'user' | 'assistant';

type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  timestamp: string;
};

function formatTime(date: Date) {
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createMessage(role: ChatRole, text: string): ChatMessage {
  const now = new Date();
  return {
    id: `${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    timestamp: formatTime(now),
  };
}

function ChatLauncher({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <Button
      type="primary"
      icon={<MessageOutlined />}
      className="chat-launcher"
      onClick={onToggle}
      aria-pressed={isOpen}
    >
      Чат
    </Button>
  );
}

function ChatMessageItem({ message }: { message: ChatMessage }) {
  const messageClass = `chat-message chat-message-${message.role}`;

  return (
    <div className={messageClass}>
      <div className="chat-message-bubble">
        <Text className="chat-message-text">{message.text}</Text>
        <Text className="chat-message-time">{message.timestamp}</Text>
      </div>
    </div>
  );
}

function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, endRef]);

  return (
    <div className="chat-message-list">
      {messages.map((message) => (
        <ChatMessageItem key={message.id} message={message} />
      ))}
      <div ref={endRef} />
    </div>
  );
}

function ChatInput({
  value,
  onChange,
  onSend,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}) {
  const isDisabled = value.trim().length === 0;

  return (
    <div className="chat-footer">
      <Input.TextArea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPressEnter={(event) => {
          if (event.shiftKey) return;
          event.preventDefault();
          if (!isDisabled) {
            onSend();
          }
        }}
        autoSize={{ minRows: 1, maxRows: 4 }}
        placeholder="Напишите сообщение..."
        className="chat-input"
        autoFocus
      />
      <Button type="primary" onClick={onSend} disabled={isDisabled}>
        Отправить
      </Button>
    </div>
  );
}

function ChatPopup({
  messages,
  value,
  onChange,
  onSend,
  onClose,
}: {
  messages: ChatMessage[];
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="chat-popup" role="dialog" aria-label="Чат">
      <div className="chat-header">
        <Text strong>Чат</Text>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} aria-label="Закрыть чат" />
      </div>
      <div className="chat-body">
        <ChatMessageList messages={messages} />
      </div>
      <ChatInput value={value} onChange={onChange} onSend={onSend} />
    </div>
  );
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage = createMessage('user', trimmed);
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    window.setTimeout(() => {
      const assistantMessage = createMessage('assistant', BOT_REPLY);
      setMessages((prev) => [...prev, assistantMessage]);
    }, 350);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className="chat-widget">
      <ChatLauncher isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />
      {isOpen && (
        <ChatPopup
          messages={messages}
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
