import axios from "axios";

const API_BASE = "http://localhost:8000";
const testUserId = "U09HETVRA6Q"; // 🔹 Firestore上のSlackユーザーID（本人）
const testChannelId = "C09K9G97HJM"; // 🔹 テスト用SlackチャンネルID
export const api = {
  // 返信送信（モック版）
  sendReply: async (channel: string, text: string, threadTs?: string) => {
    console.log("🌐 HTTP POST (モック):", `${API_BASE}/slack/reply`, {
      user_id: testUserId,
      channel,
      text,
      thread_ts: threadTs,
    });

    try {
      // --- 実際のFastAPIバックエンドに送信 ---
      const res = await axios.post(`${API_BASE}/slack/reply`, {
        user_id: testUserId, // ✅ Firestoreに登録済みのSlackユーザーID
        channel: testChannelId, // ✅ テスト用チャンネルIDに固定
        text,
        // thread_ts: threadTs,// ← スレッド返信はコメントアウトで無効化
      });

      console.log("✅ Slack送信成功:", res.data);
      return res.data;
    } catch (error: any) {
      console.error(
        "❌ Slack送信エラー:",
        error.response?.data || error.message
      );

      // --- 🧩 モックフォールバック ---
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockResponse = {
        status: "sent (mock)",
        message_id: `reply_${Date.now()}`,
        channel: channel,
        text: text,
        thread_ts: threadTs,
        timestamp: Date.now().toString(),
      };

      console.log("🧩 モックレスポンスを使用:", mockResponse);
      return mockResponse;
    }
  },

  // 未読メッセージ取得（モック版）
  getUnreadMessages: async (appId?: string) => {
    // --- テスト用にSlackなら固定ユーザーIDを設定 ---
    const testUserId = "U09HETVRA6Q";

    const endpoint =
      appId === "slack"
        ? `${API_BASE}/messages/unread/${testUserId}` // Slackなら実際のAPIを叩く
        : appId
        ? `${API_BASE}/messages/unread/${appId}` // 他のアプリ
        : `${API_BASE}/messages/unread`; // appId未指定
    console.log("🌐 HTTP GET:", endpoint);

    try {
      // --- 実際のバックエンド呼び出し ---
      const res = await axios.get(endpoint);
      console.log("✅ 未読メッセージ取得成功:", res.data);

      // Firestore形式（{ count, messages }）に対応
      if (res.data?.messages) return res.data.messages;
      return res.data || [];
    } catch (error: any) {
      console.error(
        "❌ 未読メッセージ取得エラー:",
        error.response?.data || error.message
      );

      // --- 🧩 モックフォールバック ---
      await new Promise((resolve) => setTimeout(resolve, 500)); // 0.5秒待機

      const appMessages: Record<string, any[]> = {
        slack: [
          {
            id: "slack_1",
            channel: "C1234567890",
            user: testUserId,
            text: "Slack未読メッセージ 1（モック）",
            timestamp: Date.now().toString(),
          },
          {
            id: "slack_2",
            channel: "C1234567890",
            user: testUserId,
            text: "Slack未読メッセージ 2（モック）",
            timestamp: Date.now().toString(),
          },
          {
            id: "slack_3",
            channel: "C1234567890",
            user: testUserId,
            text: "Slack未読メッセージ 3（モック）",
            timestamp: Date.now().toString(),
          },
        ],
        line: [],
        discord: [],
        teams: [],
      };

      const messages = appId ? appMessages[appId] || [] : appMessages.slack;
      console.log("🧩 モックデータを使用:", { appId, messages });
      return messages;
    }
  },
};
