#!/usr/bin/env python3
"""
WebSocketテストサーバー
10秒ごとにダミーメッセージを送信
"""

import asyncio
import websockets
import json
import time
from datetime import datetime

# 接続されたクライアントを管理
connected_clients = set()

async def register_client(websocket):
    """クライアントを登録"""
    connected_clients.add(websocket)
    print(f"✅ クライアント接続: {websocket.remote_address}")
    
    # 接続確認メッセージを送信
    await websocket.send(json.dumps({
        "type": "connected",
        "data": {"message": "WebSocket接続成功"}
    }))

async def unregister_client(websocket):
    """クライアントを登録解除"""
    connected_clients.discard(websocket)
    print(f"❌ クライアント切断: {websocket.remote_address}")

async def handle_client(websocket):
    """クライアント接続を処理"""
    await register_client(websocket)
    
    try:
        async for message in websocket:
            print(f"📨 受信メッセージ: {message}")
            
            # ping/pong処理
            if message == "ping":
                await websocket.send("pong")
                continue
            
            # その他のメッセージを処理
            try:
                data = json.loads(message)
                print(f"📨 解析されたデータ: {data}")
            except json.JSONDecodeError:
                print(f"❌ JSON解析エラー: {message}")
                
    except websockets.exceptions.ConnectionClosed:
        print("❌ クライアント接続が閉じられました")
    finally:
        await unregister_client(websocket)

async def send_periodic_messages():
    """定期的にメッセージを送信"""
    message_count = 0
    
    while True:
        await asyncio.sleep(5)  # 10秒待機
        
        if not connected_clients:
            print("⏳ 接続されたクライアントがありません")
            continue
            
        message_count += 1
        
        # ダミーメッセージを作成
        test_message = {
            "type": "new_message",
            "data": {
                "id": f"test_msg_{message_count}",
                "channel": "C1234567890",
                "user": "U1234567890",
                "text": f"テストメッセージ #{message_count} - {datetime.now().strftime('%H:%M:%S')}",
                "timestamp": str(int(time.time()))
            }
        }
        
        # 未読更新メッセージも送信
        unread_update = {
            "type": "unread_update",
            "data": {
                "total_unread": message_count,
                "latest_message": test_message["data"],
                "all_unread_messages": [test_message["data"]],
                "has_new_message": True
            }
        }
        
        # 全クライアントに送信
        disconnected_clients = set()
        for client in connected_clients:
            try:
                # 新メッセージのみ送信（未読更新は重複するため削除）
                await client.send(json.dumps(test_message))
                print(f"📤 メッセージ送信完了: {message_count}件")
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
        
        # 切断されたクライアントを削除
        for client in disconnected_clients:
            await unregister_client(client)

async def main():
    """メイン関数"""
    print("🚀 WebSocketテストサーバー開始")
    print("📡 ポート: 8000")
    print("🔄 10秒ごとにメッセージ送信")
    print("=" * 50)
    
    # WebSocketサーバーを開始
    server = await websockets.serve(handle_client, "localhost", 8000)
    
    # 定期的なメッセージ送信タスクを開始
    message_task = asyncio.create_task(send_periodic_messages())
    
    try:
        await server.wait_closed()
    except KeyboardInterrupt:
        print("\n🛑 サーバー停止中...")
        message_task.cancel()
        server.close()
        await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())
