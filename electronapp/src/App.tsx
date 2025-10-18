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

  // 泳ぎ方向の監視
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cycleTime = 8000; // 8秒周期
      const progress = (now % cycleTime) / cycleTime;
      
      if (progress < 0.25) {
        setSwimDirection('right'); // 0-25%: 右に移動
      } else if (progress < 0.5) {
        setSwimDirection('right'); // 25-50%: 右に移動
      } else if (progress < 0.75) {
        setSwimDirection('left'); // 50-75%: 左に移動
      } else {
        setSwimDirection('left'); // 75-100%: 左に移動
      }
    }, 100); // 100msごとにチェック

    return () => clearInterval(interval);
  }, []);

  // 泳ぎ方向の状態
  const [swimDirection, setSwimDirection] = useState<'left' | 'right' | 'center'>('center');

  // 画像切り替えロジック
  const getCurrentImage = () => {
    // メッセージ数による優先切り替え
    if (messages.length >= 5) {
      return deadImage; // 5件以上でdead.png
    } else if (messages.length >= 3) {
      return angryImage; // 3件以上でangry.png
    }
    
    // 泳ぎ方向による切り替え
    if (swimDirection === 'right') {
      return defaultImage; // 右に動く時はkawaii.png
    } else if (swimDirection === 'left') {
      return dragImage; // 左に動く時はsky.png
    } else {
      return defaultImage; // 中央はkawaii.png
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
    // 画像クリック時の処理を削除（メッセージタップのみ有効）
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


  // 不要な関数を削除

  // ドラッグ機能を無効化（自動泳ぎを優先）
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    // ドラッグを無効化して自動泳ぎを維持
    e.preventDefault();
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    // ドラッグを無効化
    e.preventDefault();
  };

  const handleDragEnd = () => {
    // ドラッグを無効化
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
        {/* 泳ぎ方向表示 */}
        <div 
          className="control-btn" 
          title={`泳ぎ方向: ${swimDirection}`}
          style={{ 
            backgroundColor: swimDirection === 'right' ? '#28a745' : swimDirection === 'left' ? '#007bff' : '#6c757d', 
            color: 'white',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {swimDirection === 'right' ? '→' : swimDirection === 'left' ? '←' : '○'}
        </div>
      </div>
      
      <div
        className="image-container"
        onMouseDown={handleDragStart}
        onMouseMove={handleDrag}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        onClick={handleImageClick}
      >
        <img
          src={getCurrentImage()}
          className="App-image"
          alt="Character"
          draggable="false"
        />
      </div>

      {/* メッセージ表示と返信機能（画像コンテナの外に移動） */}
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
      <div className="black-block" />
    </div>
  );
}

export default App;
