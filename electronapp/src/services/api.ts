import axios from 'axios';

const API_BASE = 'http://localhost:8000';

export const api = {
  // 返信送信（モック版）
  sendReply: async (channel: string, text: string, threadTs?: string) => {
    console.log('🌐 HTTP POST (モック):', `${API_BASE}/slack/reply`, {
      channel,
      text,
      thread_ts: threadTs
    });
    
    // モック：実際のHTTP送信をシミュレート
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    
    const mockResponse = {
      status: 'sent',
      message_id: `reply_${Date.now()}`,
      channel: channel,
      text: text,
      thread_ts: threadTs,
      timestamp: Date.now().toString()
    };
    
    console.log('🌐 HTTP レスポンス (モック):', mockResponse);
    return mockResponse;
  },

  // 未読メッセージ取得（モック版）
  getUnreadMessages: async (appId?: string) => {
    const endpoint = appId ? `${API_BASE}/messages/unread/${appId}` : `${API_BASE}/messages/unread`;
    console.log('🌐 HTTP GET (モック):', endpoint);
    
    // モック：実際のHTTP送信をシミュレート
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5秒待機
    
    // Slackのみ実際のデータ、他は完全ダミー
    const appMessages: Record<string, any[]> = {
      slack: [
        { id: 'slack_1', channel: 'C1234567890', user: 'U1234567890', text: 'Slack未読メッセージ 1', timestamp: Date.now().toString() },
        { id: 'slack_2', channel: 'C1234567890', user: 'U1234567890', text: 'Slack未読メッセージ 2', timestamp: Date.now().toString() },
        { id: 'slack_3', channel: 'C1234567890', user: 'U1234567890', text: 'Slack未読メッセージ 3', timestamp: Date.now().toString() }
      ],
      line: [], // 完全ダミー
      discord: [], // 完全ダミー
      teams: [] // 完全ダミー
    };
    
    const messages = appId ? appMessages[appId] || [] : appMessages.slack;
    
    console.log('🌐 HTTP レスポンス (モック):', { appId, messages });
    return messages;
  }
};
