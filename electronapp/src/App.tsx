import React, { useState, useRef, useEffect } from "react";
import "./App.css";

import { wsService } from "./services/websocket";
import { api } from "./services/api";
const dragImage = "/images/sky.png";
const defaultImage = "/images/kawaii.png";
const angryImage = "/images/angry.png";
const deadImage = "/images/dead.png";

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
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);

  // アプリケーション別の状態
  const [currentApp, setCurrentApp] = useState<string | null>(null);
  const [appMessages, setAppMessages] = useState<Record<string, Message[]>>({
    slack: [],
    line: [],
    discord: [],
    teams: [],
  });

  // 新規メッセージの吹き出し表示
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [showBubble, setShowBubble] = useState(false);

  // パーティクル効果
  const [showParticles, setShowParticles] = useState(false);

  // フグの震えエフェクト
  const [fishShake, setFishShake] = useState(false);

  // Slackフグの位置追跡
  const [slackFishPosition, setSlackFishPosition] = useState({ x: 0, y: 0 });

  // Slackフグのサイズ管理
  const [slackFishScale, setSlackFishScale] = useState(1);

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // WebSocket接続とメッセージ監視
  useEffect(() => {
    console.log("🔌 WebSocket接続開始...");

    // 既存のイベントリスナーをクリア
    wsService.disconnect();

    // WebSocket接続
    wsService.connect();

    // 接続状態監視
    const handleConnected = () => {
      console.log("✅ WebSocket接続成功");
    };

    const handleDisconnected = () => {
      console.log("❌ WebSocket接続切断");
    };

    const handleError = (error: any) => {
      console.error("❌ WebSocketエラー:", error);
    };

    // 新しいメッセージを受信（Slackのみ）
    const handleNewMessage = (data: Message) => {
      console.log("📨 新メッセージ受信:", data);

      // Slackのメッセージのみ処理
      if (data.channel && data.user) {
        // Slackのメッセージリストに追加
        setAppMessages((prev) => ({
          ...prev,
          slack: [data, ...(prev.slack || [])],
        }));

        // フグを震わせる
        setFishShake(true);
        setTimeout(() => setFishShake(false), 500);

        // Slackフグを大きくする（初期画面のみ、元に戻さない）
        if (!currentApp) {
          setSlackFishScale((prev) => Math.min(prev + 1.3, 3.0)); // 1.3倍ずつ大きく、最大3倍まで
        }

        // 吹き出し表示
        setNewMessage(data);
        setShowBubble(true);

        // 3秒後に吹き出しを非表示
        setTimeout(() => {
          setShowBubble(false);
          setNewMessage(null);
        }, 3000);

        // デスクトップ通知
        if (Notification.permission === "granted") {
          new Notification("新しいSlackメッセージ", {
            body: data.text,
            icon: "/icon.png",
          });
        }
      }
    };

    // 未読メッセージ更新を受信
    const handleUnreadUpdate = (data: any) => {
      console.log("📋 未読更新受信:", data);
      if (data.all_unread_messages) {
        setMessages(data.all_unread_messages);
      }
    };

    // イベントリスナーを登録
    wsService.on("connected", handleConnected);
    wsService.on("disconnected", handleDisconnected);
    wsService.on("error", handleError);
    wsService.on("new_message", handleNewMessage);
    wsService.on("unread_update", handleUnreadUpdate);

    // 通知許可を要求
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      console.log("🔌 WebSocket切断...");
      // イベントリスナーを削除
      wsService.off("connected", handleConnected);
      wsService.off("disconnected", handleDisconnected);
      wsService.off("error", handleError);
      wsService.off("new_message", handleNewMessage);
      wsService.off("unread_update", handleUnreadUpdate);
      wsService.disconnect();
    };
  }, [currentApp]); // currentAppを依存配列に追加

  // 泳ぎ方向の監視
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cycleTime = 8000; // 8秒周期
      const progress = (now % cycleTime) / cycleTime;

      if (progress < 0.25) {
        setSwimDirection("right"); // 0-25%: 右に移動
      } else if (progress < 0.5) {
        setSwimDirection("right"); // 25-50%: 右に移動
      } else if (progress < 0.75) {
        setSwimDirection("left"); // 50-75%: 左に移動
      } else {
        setSwimDirection("left"); // 75-100%: 左に移動
      }
    }, 100); // 100msごとにチェック

    return () => clearInterval(interval);
  }, []);

  // Slackフグの位置追跡
  useEffect(() => {
    const updateSlackFishPosition = () => {
      const slackFishElement = document.querySelector(".app-fish:first-child");
      if (slackFishElement) {
        const rect = slackFishElement.getBoundingClientRect();
        setSlackFishPosition({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        });
      }
    };

    // 初期位置設定
    updateSlackFishPosition();

    // 定期的に位置更新
    const interval = setInterval(updateSlackFishPosition, 100);

    return () => clearInterval(interval);
  }, []);

  // 泳ぎ方向の状態
  const [swimDirection, setSwimDirection] = useState<
    "left" | "right" | "center"
  >("center");

  // 画像切り替えロジック
  const getCurrentImage = (appId?: string) => {
    // Slackフグのみメッセージ数による表情変化を適用
    if (appId === "slack") {
      const slackMsgCount = appMessages.slack?.length || 0;
      if (slackMsgCount >= 5) {
        return deadImage; // 5件以上でdead.png
      } else if (slackMsgCount >= 3) {
        return angryImage; // 3件以上でangry.png
      }
    }

    // 泳ぎ方向による切り替え（全フグ共通）
    if (swimDirection === "right") {
      return defaultImage; // 右に動く時はkawaii.png
    } else if (swimDirection === "left") {
      return dragImage; // 左に動く時はsky.png
    } else {
      return defaultImage; // 中央はkawaii.png
    }
  };

  // 返信処理
  const handleReply = async () => {
    if (!selectedMessage || !replyText.trim()) return;

    try {
      console.log("🚀 HTTP送信開始:", {
        channel: selectedMessage.channel,
        text: replyText,
        messageId: selectedMessage.id,
      });

      await api.sendReply(
        selectedMessage.channel,
        replyText,
        selectedMessage.id
      );

      console.log("✅ HTTP送信成功");
      setReplyText("");
      setShowReplyInput(false);
      setSelectedMessage(null);
      alert("返信しました！");
    } catch (error) {
      console.error("❌ HTTP送信失敗:", error);
      alert("返信に失敗しました");
    }
  };

  const [isClicked, setIsClicked] = useState(false);

  // アプリケーション別フグの定義
  const apps = [
    { id: "slack", name: "Slack", color: "#4A154B", icon: "💬" },
    { id: "line", name: "LINE", color: "#00C300", icon: "💚" },
    { id: "discord", name: "Discord", color: "#5865F2", icon: "🎮" },
    { id: "teams", name: "Teams", color: "#6264A7", icon: "👥" },
  ];

  const handleAppClick = async (appId: string) => {
    // Slackのみ詳細画面に遷移
    if (appId !== "slack") {
      console.log(`🚫 ${appId}は詳細画面に遷移しません（Slackのみ対応）`);
      return;
    }

    // パーティクル効果を発動
    setShowParticles(true);
    setTimeout(() => setShowParticles(false), 600);

    setCurrentApp(appId);
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 500);

    // Slackフグのサイズをリセット（詳細画面に遷移時）
    if (appId === "slack") {
      setSlackFishScale(1);
    }

    // Slackの詳細画面でDBから未読一覧を取得
    try {
      console.log(`🔍 ${appId}の未読メッセージを取得中...`);
      const unreadMessages = await api.getUnreadMessages(appId);
      setAppMessages((prev) => ({
        ...prev,
        [appId]: unreadMessages,
      }));
      console.log(`✅ ${appId}の未読メッセージ取得完了:`, unreadMessages);
    } catch (error) {
      console.error(`❌ ${appId}の未読メッセージ取得失敗:`, error);
    }
  };

  const handleBackToHome = () => {
    setCurrentApp(null);
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
      channel: "C1234567890",
      user: "U1234567890",
      text: `テストメッセージ ${messages.length + 1}`,
      timestamp: Date.now().toString(),
    };
    setMessages((prev) => [testMessage, ...prev]);

    // アプリケーション別にも追加
    if (currentApp) {
      setAppMessages((prev) => ({
        ...prev,
        [currentApp]: [testMessage, ...(prev[currentApp] || [])],
      }));
    }

    console.log("🧪 テストメッセージ追加:", testMessage);
  };

  // テスト用：HTTP送信テスト
  const testHttpSend = async () => {
    try {
      console.log("🧪 HTTP送信テスト開始");
      const result = await api.sendReply(
        "C1234567890",
        "テスト送信メッセージ",
        "test_thread_123"
      );
      console.log("🧪 HTTP送信テスト結果:", result);
      alert("HTTP送信テスト完了！");
    } catch (error) {
      console.error("🧪 HTTP送信テスト失敗:", error);
      alert("HTTP送信テスト失敗");
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
          style={{ backgroundColor: "#6f42c1", color: "white" }}
        >
          🧪
        </button>
        {/* HTTP送信テストボタン */}
        <button
          className="control-btn"
          onClick={testHttpSend}
          title="HTTP送信テスト"
          style={{ backgroundColor: "#fd7e14", color: "white" }}
        >
          📤
        </button>
        {/* 泳ぎ方向表示 */}
        <div
          className="control-btn"
          title={`泳ぎ方向: ${swimDirection}`}
          style={{
            backgroundColor:
              swimDirection === "right"
                ? "#28a745"
                : swimDirection === "left"
                ? "#007bff"
                : "#6c757d",
            color: "white",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {swimDirection === "right"
            ? "→"
            : swimDirection === "left"
            ? "←"
            : "○"}
        </div>
      </div>

      {/* 初期画面: 複数フグ表示 */}
      {!currentApp && (
        <div className="fish-swarm">
          {apps.map((app, index) => (
            <div
              key={app.id}
              className="app-fish"
              style={
                {
                  "--delay": `${index * 0.5}s`,
                  "--color": app.color,
                } as React.CSSProperties
              }
              onClick={() => handleAppClick(app.id)}
            >
              <div className="fish-container">
                <img
                  src={getCurrentImage(app.id)}
                  className={`App-image ${isClicked ? "clicked" : ""} ${
                    fishShake ? "shake" : ""
                  }`}
                  alt={`${app.name} Fish`}
                  draggable="false"
                  style={{
                    transform:
                      app.id === "slack"
                        ? `scale(${slackFishScale})`
                        : "scale(1)",
                    transition: "transform 0.3s ease-in-out",
                  }}
                />
                <div className="app-icon">{app.icon}</div>
                <div className="app-name">{app.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* アプリケーション別画面: 単一フグ + メッセージ */}
      {currentApp && (
        <div className="app-page">
          <div className="app-header">
            <button className="back-button" onClick={handleBackToHome}>
              ← 戻る
            </button>
            <h2>{apps.find((app) => app.id === currentApp)?.name}</h2>
          </div>

          <div
            className="image-container"
            onMouseDown={handleDragStart}
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <img
              src={getCurrentImage(currentApp)}
              className={`App-image ${isClicked ? "clicked" : ""} ${
                fishShake ? "shake" : ""
              }`}
              alt="Character"
              draggable="false"
            />
          </div>
        </div>
      )}

      {/* メッセージ表示と返信機能（アプリケーション別画面でのみ表示） */}
      {currentApp &&
        appMessages[currentApp] &&
        appMessages[currentApp].length > 0 && (
          <div className="messages-container">
            <div className="messages-list">
              {appMessages[currentApp].slice(0, 3).map((message) => (
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

      {/* パーティクル効果 */}
      {showParticles && (
        <div className="particles-container">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={
                {
                  "--delay": `${i * 0.1}s`,
                  "--angle": `${i * 45}deg`,
                  "--distance": `${80 + (i % 3) * 40}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      )}

      {/* Slackフグ専用のメッセージ表示 */}
      {showBubble && newMessage && (
        <div
          className="slack-message-follow"
          style={{
            position: "fixed",
            left: `${slackFishPosition.x}px`,
            top: `${slackFishPosition.y + 80}px`,
            transform: "translate(-50%, -50%)",
            zIndex: 2000,
          }}
        >
          <div className="slack-bubble">
            <div className="slack-badge">💬 Slack</div>
            <div className="slack-message-text">{newMessage.text}</div>
            <div className="slack-message-user">@{newMessage.user}</div>
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
              <button
                onClick={() => {
                  setShowReplyInput(false);
                  setSelectedMessage(null);
                  setReplyText("");
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="black-block" />
    </div>
  );
}

export default App;
