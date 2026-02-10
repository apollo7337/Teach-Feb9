
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus } from '../types';

interface HybridRecorderProps {
  status: AppStatus;
  onAudioReady: (base64: string, mimeType: string) => void;
  setStatus: (status: AppStatus) => void;
}

export const HybridRecorder: React.FC<HybridRecorderProps> = ({ status, onAudioReady, setStatus }) => {
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check existing permission status if supported
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as PermissionName })
        .then((permissionStatus) => {
          setPermissionState(permissionStatus.state as any);
          permissionStatus.onchange = () => {
            setPermissionState(permissionStatus.state as any);
          };
        })
        .catch(err => console.debug("Permissions API not fully supported", err));
    }
  }, []);

  const getSupportedAudioMimeType = () => {
    const types = [
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/aac',
      'audio/wav'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return 'audio/wav'; 
  };

  const startLiveRecording = async () => {
    if (status === AppStatus.ERROR) {
      setStatus(AppStatus.IDLE);
    }

    try {
      if (!window.isSecureContext) {
        throw new Error("Recording requires a secure (HTTPS) connection.");
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported by your browser configuration.");
      }

      // Explicitly request ONLY audio.
      const constraints = { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false // Force false to prevent camera UI on mobile
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setPermissionState('granted');
      
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          onAudioReady(base64, mimeType);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setStatus(AppStatus.RECORDING);
    } catch (err: any) {
      console.error("Recording error:", err);
      let errorMessage = "Microphone access failed.";
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        errorMessage = "PERMISSION_DENIED: Access blocked. Please check your browser's site settings.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = "No microphone found.";
      } else {
        errorMessage = err.message || "Unknown microphone error.";
      }

      window.dispatchEvent(new CustomEvent('app-error', { detail: errorMessage }));
      setStatus(AppStatus.ERROR);
    }
  };

  const stopLiveRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const isBusy = status === AppStatus.TRANSCRIBING || status === AppStatus.GENERATING;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={status === AppStatus.RECORDING ? stopLiveRecording : startLiveRecording}
        disabled={isBusy}
        className={`flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all active:scale-95 ${
          status === AppStatus.RECORDING 
          ? 'bg-red-500 text-white animate-pulse' 
          : isBusy
          ? 'bg-gray-100 text-gray-400'
          : status === AppStatus.ERROR || permissionState === 'denied'
          ? 'bg-red-50 text-red-600 border border-red-200'
          : 'bg-[#1d1d1f] text-white hover:bg-black shadow-lg shadow-gray-200'
        }`}
      >
        <div className={`w-3 h-3 rounded-full ${
          status === AppStatus.RECORDING 
          ? 'bg-white' 
          : status === AppStatus.ERROR || permissionState === 'denied' 
          ? 'bg-red-600 animate-ping' 
          : 'bg-red-500'
        }`} />
        
        {status === AppStatus.RECORDING 
          ? 'Stop Recording' 
          : status === AppStatus.TRANSCRIBING
          ? 'Transcribing...'
          : permissionState === 'denied' 
          ? 'Mic Blocked' 
          : status === AppStatus.ERROR 
          ? 'Retry' 
          : 'Record Bio'
        }
      </button>
      
      {permissionState === 'denied' && (
        <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded-md">
          Access Blocked: Fix in Settings
        </span>
      )}
    </div>
  );
};
