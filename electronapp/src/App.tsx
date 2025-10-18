import React, { useState, useRef, useEffect } from 'react';
import './App.css';
import dragImage from './sky.png';
import defaultImage from './kawaii.png';
import angryImage from './angry.png';
import deadImage from './dead.png';
import { wsService } from './services/websocket';
import { api } from './services/api';

// Message型定義
interface Message {
  id: string;
  channel: string;
  user: string;
  text: string;
  timestamp: string;
}

function App() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showInput, setShowInput] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartY, setDragStartY] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isMoveMode, setIsMoveMode] = useState(false);
  
  // WebSocket関連の状態
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // WebSocket接続とメッセージ監視
  useEffect(() => {
    console.log('🔌 WebSocket接続開始...');
    
    // 既存のイベントリスナーをクリア
    wsService.disconnect();
    
    // WebSocket接続
    wsService.connect();
    
    // 接続状態監視
    const handleConnected = () => {
      console.log('✅ WebSocket接続成功');
    };
    
    const handleDisconnected = () => {
      console.log('❌ WebSocket接続切断');
    };
    
    const handleError = (error: any) => {
      console.error('❌ WebSocketエラー:', error);
    };
    
    // 新しいメッセージを受信
    const handleNewMessage = (data: Message) => {
      console.log('📨 新メッセージ受信:', data);
      setMessages(prev => {
        // 重複チェック：同じIDのメッセージが既に存在する場合は追加しない
        const exists = prev.some(msg => msg.id === data.id);
        if (exists) {
          console.log('⚠️ 重複メッセージをスキップ:', data.id);
          return prev;
        }
        return [data, ...prev];
      });
      
      // デスクトップ通知
      if (Notification.permission === 'granted') {
        new Notification('新しいメッセージ', {
          body: data.text,
          icon: '/icon.png'
        });
      }
    };

    // 未読メッセージ更新を受信
    const handleUnreadUpdate = (data: any) => {
      console.log('📋 未読更新受信:', data);
      if (data.all_unread_messages) {
        setMessages(data.all_unread_messages);
      }
    };

    // イベントリスナーを登録
    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('error', handleError);
    wsService.on('new_message', handleNewMessage);
    wsService.on('unread_update', handleUnreadUpdate);

    // 通知許可を要求
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      console.log('🔌 WebSocket切断...');
      // イベントリスナーを削除
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('error', handleError);
      wsService.off('new_message', handleNewMessage);
      wsService.off('unread_update', handleUnreadUpdate);
      wsService.disconnect();
    };
  }, []);

  // 画像切り替えロジック
  const getCurrentImage = () => {
    if (messages.length >= 5) {
      return deadImage; // 5件以上でdead.png
    } else if (messages.length >= 3) {
      return angryImage; // 3件以上でangry.png
    } else if (dragging) {
      return dragImage; // ドラッグ中はsky.png
    } else {
      return defaultImage; // 通常時はkawaii.png
    }
  };

  // 返信処理
  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      console.log('🚀 HTTP送信開始:', {
        channel: selectedMessage.channel,
        text: replyText,
        messageId: selectedMessage.id
      });
      
      await api.sendReply(
        selectedMessage.channel,
        replyText,
        selectedMessage.id
      );
      
      console.log('✅ HTTP送信成功');
      setReplyText('');
      setShowReplyInput(false);
      setSelectedMessage(null);
      alert('返信しました！');
    } catch (error) {
      console.error('❌ HTTP送信失敗:', error);
      alert('返信に失敗しました');
    }
  };

  const handleImageClick = () => {
    if (!isMoveMode && !dragging) {
      setIsMoveMode(true);
    }
    setShowOverlay(!showOverlay);
    if (!showOverlay) {
      setInput('');
      setResponse('');
      setShowInput(true);
    }
  };

  // メッセージクリック時の処理
  const handleMessageClick = (message: Message) => {
    setSelectedMessage(message);
    setShowReplyInput(true);
  };

  // テスト用：ダミーメッセージ追加
  const addTestMessage = () => {
    const testMessage: Message = {
      id: `test_${Date.now()}`,
      channel: 'C1234567890',
      user: 'U1234567890',
      text: `テストメッセージ ${messages.length + 1}`,
      timestamp: Date.now().toString()
    };
    setMessages(prev => [testMessage, ...prev]);
    console.log('🧪 テストメッセージ追加:', testMessage);
  };

  // テスト用：HTTP送信テスト
  const testHttpSend = async () => {
    try {
      console.log('🧪 HTTP送信テスト開始');
      const result = await api.sendReply(
        'C1234567890',
        'テスト送信メッセージ',
        'test_thread_123'
      );
      console.log('🧪 HTTP送信テスト結果:', result);
      alert('HTTP送信テスト完了！');
    } catch (error) {
      console.error('🧪 HTTP送信テスト失敗:', error);
      alert('HTTP送信テスト失敗');
    }
  };


  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setResponse(data.response);
      setShowInput(false);
    } catch (error) {
      console.error('Error details:', error);
      setResponse(`Error: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setInput('');
    setResponse('');
    setShowInput(true);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement; // HTMLElementにキャスト
    if (
      target === inputRef.current ||
      target === buttonRef.current ||
      (target.className === 'black-block' && target.tagName === 'DIV') // 黒いブロックに反応しないようにする
    ) {
      return;
    }
    setDragging(true);
    setDragStartX(e.clientX - position.x);
    setDragStartY(e.clientY - position.y);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragging) {
      const newX = e.clientX - dragStartX;
      const newY = e.clientY - dragStartY;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleDragEnd = () => {
    setDragging(false);
    setIsMoveMode(false);
  };

  return (
    <div className="App">
      {/* ウィンドウ操作ボタン */}
      <div className="window-controls">
        <button 
          className="control-btn minimize-btn" 
          onClick={() => window.electronAPI?.minimize()}
          title="最小化"
        >
          −
        </button>
        <button 
          className="control-btn maximize-btn" 
          onClick={() => window.electronAPI?.maximize()}
          title="最大化"
        >
          □
        </button>
        <button 
          className="control-btn fullscreen-btn" 
          onClick={() => window.electronAPI?.setFullscreen()}
          title="全画面"
        >
          ⛶
        </button>
        <button 
          className="control-btn close-btn" 
          onClick={() => window.electronAPI?.close()}
          title="閉じる"
        >
          ×
        </button>
        {/* テスト用ボタン */}
        <button 
          className="control-btn" 
          onClick={addTestMessage}
          title="テストメッセージ追加"
          style={{ backgroundColor: '#6f42c1', color: 'white' }}
        >
          🧪
        </button>
        {/* HTTP送信テストボタン */}
        <button 
          className="control-btn" 
          onClick={testHttpSend}
          title="HTTP送信テスト"
          style={{ backgroundColor: '#fd7e14', color: 'white' }}
        >
          📤
        </button>
      </div>
      
      <div
        className="image-container"
        onMouseDown={handleDragStart}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onClick={handleImageClick}
        style={{
          position: 'relative',
          left: position.x,
          top: position.y,
          cursor: isMoveMode || dragging ? 'move' : 'auto',
        }}
      >
        {showOverlay && (
          <div className="overlay" onClick={handleOverlayClick}>
            {showInput ? (
              <div className="input-container">
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Enter text"
                  value={input}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
                <button ref={buttonRef} onClick={handleSubmit} disabled={isLoading}>
                  {isLoading ? 'Loading...' : 'Submit'}
                </button>
              </div>
            ) : (
              <div className="response-container">
                <div className="response-text">
                  <p>{response}</p>
                </div>
                <button onClick={handleReset}>もう一度話す</button>
              </div>
            )}
          </div>
        )}

        {/* メッセージ表示と返信機能 */}
        {messages.length > 0 && (
          <div className="messages-container">
            <div className="messages-list">
              {messages.slice(0, 3).map((message) => (
                <div 
                  key={message.id} 
                  className="message-item"
                  onClick={() => handleMessageClick(message)}
                >
                  <div className="message-text">{message.text}</div>
                  <div className="message-user">@{message.user}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 返信入力 */}
        {showReplyInput && selectedMessage && (
          <div className="reply-overlay">
            <div className="reply-input">
              <h4>返信: {selectedMessage.text}</h4>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="返信を入力..."
              />
              <div className="reply-buttons">
                <button onClick={handleReply}>送信</button>
                <button onClick={() => {
                  setShowReplyInput(false);
                  setSelectedMessage(null);
                  setReplyText('');
                }}>キャンセル</button>
              </div>
            </div>
          </div>
        )}
        <img
          src={getCurrentImage()}
          className="App-image"
          alt="Character"
          draggable="false"
        />
      </div>
      <div className="black-block" />
    </div>
  );
}

export default App;
