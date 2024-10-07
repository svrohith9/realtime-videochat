import React, { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { Video, Phone, PhoneOff } from 'lucide-react';

const App: React.FC = () => {
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incall'>('idle');
  const [peer, setPeer] = useState<Peer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing...');
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const currentCallRef = useRef<Peer.MediaConnection | null>(null);

  useEffect(() => {
    const newPeer = new Peer({
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'turn:numb.viagenie.ca', username: 'webrtc@live.com', credential: 'muazkh' }
        ]
      }
    });

    newPeer.on('open', (id) => {
      console.log('My peer ID is: ' + id);
      setPeerId(id);
      setStatusMessage('Connected to PeerJS server');
    });

    newPeer.on('error', (error) => {
      console.error('PeerJS error:', error);
      setErrorMessage(`PeerJS error: ${error.type}`);
    });

    newPeer.on('call', handleIncomingCall);

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  const handleIncomingCall = (call: Peer.MediaConnection) => {
    setStatusMessage('Incoming call...');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        call.answer(stream);
        setupCallEventHandlers(call, stream);
      })
      .catch((error) => {
        console.error('Failed to get local stream', error);
        setErrorMessage(`Failed to access camera/microphone: ${error.message}`);
      });
  };

  const setupCallEventHandlers = (call: Peer.MediaConnection, localStream: MediaStream) => {
    currentCallRef.current = call;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    call.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      setStatusMessage('Connected to remote peer');
    });

    call.on('close', () => {
      setCallStatus('idle');
      setStatusMessage('Call ended');
    });

    setCallStatus('incall');
  };

  const handleCall = () => {
    if (peer && remotePeerId) {
      setStatusMessage('Initiating call...');
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          const call = peer.call(remotePeerId, stream);
          setupCallEventHandlers(call, stream);
        })
        .catch((error) => {
          console.error('Failed to get local stream', error);
          setErrorMessage(`Failed to access camera/microphone: ${error.message}`);
        });
    } else {
      setErrorMessage('Please enter a remote peer ID');
    }
  };

  const handleEndCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      (localVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
    }
    setCallStatus('idle');
    setRemotePeerId('');
    setStatusMessage('Call ended');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-center">Video Chat App</h1>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Your Peer ID: {peerId}</p>
          <p className="text-sm text-gray-600">Status: {statusMessage}</p>
          {errorMessage && <p className="text-sm text-red-500">{errorMessage}</p>}
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={remotePeerId}
            onChange={(e) => setRemotePeerId(e.target.value)}
            placeholder="Enter remote peer ID"
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="flex justify-center mb-4">
          {callStatus === 'idle' ? (
            <button
              onClick={handleCall}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center"
            >
              <Phone className="mr-2" size={20} /> Call
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 flex items-center"
            >
              <PhoneOff className="mr-2" size={20} /> End Call
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between">
          <div className="w-full sm:w-1/2 p-2">
            <h2 className="text-lg font-semibold mb-2">Local Video</h2>
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-auto bg-black"></video>
          </div>
          <div className="w-full sm:w-1/2 p-2">
            <h2 className="text-lg font-semibold mb-2">Remote Video</h2>
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-auto bg-black"></video>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;