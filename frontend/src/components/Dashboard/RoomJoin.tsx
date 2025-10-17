import React, { useState } from 'react';

interface RoomJoinProps {
  onJoin: (roomCode: string, username: string) => void;
  onClose?: () => void;
}

const RoomJoin: React.FC<RoomJoinProps> = ({ onJoin, onClose }) => {
  const [roomCode, setRoomCode] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim() && username.trim()) {
      onJoin(roomCode.trim(), username.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 relative shadow-2xl">
        {/* Schließen-Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors text-3xl leading-none"
            title="Schließen"
          >
            ×
          </button>
        )}
        
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Sitzung beitreten
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700 mb-2">
              Raumcode
            </label>
            <input
              id="roomCode"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="DE"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
              Ihr Name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="DE"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition-colors shadow-lg"
          >
            Beitreten
          </button>
        </form>
      </div>
    </div>
  );
};

export default RoomJoin;