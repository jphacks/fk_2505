import React, { useState, useRef } from 'react';
import './App.css';
import dragImage from './sky.png';
import aaImage from './kawaii.png';

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

  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
          onClick={() => window.electronAPI.minimize()}
          title="最小化"
        >
          −
        </button>
        <button 
          className="control-btn maximize-btn" 
          onClick={() => window.electronAPI.maximize()}
          title="最大化"
        >
          □
        </button>
        <button 
          className="control-btn fullscreen-btn" 
          onClick={() => window.electronAPI.setFullscreen()}
          title="全画面"
        >
          ⛶
        </button>
        <button 
          className="control-btn close-btn" 
          onClick={() => window.electronAPI.close()}
          title="閉じる"
        >
          ×
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
        {dragging ? (
          <img
            src={dragImage}
            className="App-image"
            alt="Example"
            draggable="false"
          />
        ) : (
          <img src={aaImage} className="App-image" alt="Example" />
        )}
      </div>
      <div className="black-block" />
    </div>
  );
}

export default App;
