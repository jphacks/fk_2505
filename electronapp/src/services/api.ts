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
  getUnreadMessages: async () => {
    console.log('🌐 HTTP GET (モック):', `${API_BASE}/messages/unread`);
    
    // モック：実際のHTTP送信をシミュレート
    await new Promise(resolve => setTimeout(resolve, 500)); // 0.5秒待機
    
    const mockResponse = {
      messages: [
        {
          id: 'mock_msg_1',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'モック未読メッセージ 1',
          timestamp: Date.now().toString()
        },
        {
          id: 'mock_msg_2',
          channel: 'C1234567890',
          user: 'U1234567890',
          text: 'モック未読メッセージ 2',
          timestamp: Date.now().toString()
        }
      ]
    };
    
    console.log('🌐 HTTP レスポンス (モック):', mockResponse);
    return mockResponse.messages;
  }
};
