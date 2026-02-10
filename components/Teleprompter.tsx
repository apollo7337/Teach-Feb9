
import React, { useState, useRef, useEffect } from 'react';

interface TeleprompterProps {
  text: string;
  onClose: () => void;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ text, onClose }) => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(40);
  const [showCamera, setShowCamera] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playbackMode, setPlaybackMode] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playbackRef = useRef<HTMLVideoElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const scrollPosRef = useRef<number>(0);
  
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const getSupportedMimeType = () => {
    const types = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm',
      'video/quicktime'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const animateScroll = (time: number) => {
    if (lastTimeRef.current !== null && isScrolling && containerRef.current) {
      const deltaTime = (time - lastTimeRef.current) / 1000;
      const moveBy = speed * deltaTime;
      scrollPosRef.current += moveBy;
      containerRef.current.scrollTop = scrollPosRef.current;
    }
    lastTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animateScroll);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateScroll);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isScrolling, speed]);

  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  };

  const startCamera = async () => {
    try {
      setPermissionDenied(false);
      if (streamRef.current) {
        if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        setShowCamera(true);
        return streamRef.current;
      }

      // STRICT LANDSCAPE CONSTRAINTS
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          aspectRatio: { exact: 1.7777777778 } 
        },
        audio: true
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setShowCamera(true);
      setPlaybackMode(false);
      return stream;
    } catch (err: any) {
      console.error("Camera access failed", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else {
        alert(`Camera Error: ${err.message || "Failed to start landscape camera."}`);
      }
      return null;
    }
  };

  const stopCameraStreams = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const toggleCameraVisibility = async () => {
    if (!showCamera) {
      await startCamera();
    } else {
      if (isRecording) {
        setShowCamera(false);
      } else {
        stopCameraStreams();
      }
    }
  };

  const startRecording = async () => {
    let stream = streamRef.current;
    if (!stream) {
      stream = await startCamera();
    }
    if (!stream) return;

    setRecordedVideoUrl(null);
    setPlaybackMode(false);
    chunksRef.current = [];
    
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      alert("Recording not supported.");
      return;
    }

    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 5000000 // Higher quality for landscape
    });
    
    mediaRecorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
    };

    recorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    setIsScrolling(true);
    scrollPosRef.current = 0;
    if (containerRef.current) containerRef.current.scrollTop = 0;

    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsScrolling(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const downloadVideo = () => {
    if (recordedVideoUrl) {
      const extension = getSupportedMimeType().includes('mp4') ? 'mp4' : 'webm';
      const a = document.createElement('a');
      a.href = recordedVideoUrl;
      a.download = `teacher-intro-landscape-${Date.now()}.${extension}`;
      a.click();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center overflow-hidden">
      
      {/* 16:9 Landscape Frame Guide */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="relative aspect-video w-full h-full md:h-auto md:w-full overflow-hidden">
           <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover scale-x-[-1] transition-opacity duration-300 ${
              showCamera && !playbackMode && !permissionDenied ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Subtle Safe-Zone Overlay */}
          <div className="absolute inset-0 border-[40px] border-black/10 pointer-events-none border-dashed opacity-30" />
        </div>
      </div>

      {permissionDenied && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-10 p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Camera Access Required</h3>
          <p className="text-gray-400 max-w-sm mb-6">Enable camera to record your landscape intro.</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold">Refresh</button>
        </div>
      )}

      {playbackMode && recordedVideoUrl && (
        <video
          ref={playbackRef}
          src={recordedVideoUrl}
          autoPlay
          playsInline
          controls
          className="absolute inset-0 w-full h-full object-contain bg-black z-40"
        />
      )}

      {/* Dimmer and Gradient Overlays */}
      {!playbackMode && !permissionDenied && (
        <div className={`absolute inset-0 transition-opacity duration-500 z-10 ${showCamera ? 'bg-black/60' : 'bg-black'}`} />
      )}
      {!playbackMode && !permissionDenied && <div className="teleprompter-gradient absolute inset-0 pointer-events-none z-20" />}

      {/* HUD Info */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2">
        {isRecording && (
          <div className="flex items-center gap-3 bg-red-600 text-white px-5 py-2 rounded-full font-bold animate-pulse backdrop-blur-md border border-white/30 shadow-2xl">
            <div className="w-3 h-3 bg-white rounded-full" />
            REC {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
          </div>
        )}
        <span className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">16:9 Landscape Mode</span>
      </div>

      {/* Top Controls */}
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-50">
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={toggleCameraVisibility}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full backdrop-blur-lg font-semibold border transition-all ${
              showCamera 
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30' 
                : 'bg-white/10 text-white border-white/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            {showCamera ? 'Hide Camera' : 'Show Camera'}
          </button>
          {recordedVideoUrl && (
            <button onClick={() => setPlaybackMode(!playbackMode)} className="px-5 py-2.5 rounded-full backdrop-blur-lg font-semibold border bg-white/10 text-white border-white/20">
              {playbackMode ? 'Back to Script' : 'Review Draft'}
            </button>
          )}
        </div>
        <button onClick={onClose} className="bg-white/10 text-white px-6 py-2.5 rounded-full backdrop-blur-lg opacity-80 hover:opacity-100 transition-all font-semibold">Exit</button>
      </div>

      {/* Speed Controls */}
      {!playbackMode && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-5 bg-black/40 p-5 rounded-[32px] backdrop-blur-2xl border border-white/10 z-50">
          <button onClick={() => setSpeed(prev => Math.max(10, prev - 10))} className="text-white/40 hover:text-white transition-transform active:scale-75"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg></button>
          <span className="text-xl font-black text-white">{speed}</span>
          <button onClick={() => setSpeed(prev => Math.min(200, prev + 10))} className="text-white/40 hover:text-white transition-transform active:scale-75"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg></button>
        </div>
      )}

      {/* Script Content */}
      {!playbackMode && (
        <div 
          ref={containerRef}
          className="max-w-5xl w-full h-full overflow-y-auto no-scrollbar flex flex-col items-center z-30"
          onScroll={(e) => { if (!isScrolling) scrollPosRef.current = (e.target as HTMLDivElement).scrollTop; }}
        >
          <div className="h-[45vh] shrink-0" />
          <div className="text-white text-center text-4xl md:text-6xl font-black leading-tight px-16 drop-shadow-[0_10px_30px_rgba(0,0,0,1)]">
            {text.split('\n').map((para, i) => para.trim() && <p key={i} className="mb-24 last:mb-0">{para}</p>)}
          </div>
          <div className="h-[55vh] shrink-0" />
        </div>
      )}

      {/* Main Controls (Bottom) */}
      {!playbackMode && !permissionDenied && (
        <div className="fixed bottom-12 z-50 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4 bg-black/40 p-2 rounded-full backdrop-blur-3xl border border-white/10">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-12 py-5 rounded-full font-black text-xl transition-all border-2 ${
                isRecording 
                  ? 'bg-red-600 text-white border-red-400' 
                  : 'bg-white text-black border-transparent hover:scale-105'
              }`}
            >
              {isRecording ? 'STOP' : 'START RECORDING'}
            </button>
            <button
              onClick={toggleScroll}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all border-2 ${
                isScrolling ? 'bg-blue-600 text-white border-blue-400' : 'bg-white/10 text-white border-white/20'
              }`}
            >
              {isScrolling ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              )}
            </button>
          </div>
          
          {recordedVideoUrl && !isRecording && (
            <div className="flex gap-4">
              <button onClick={downloadVideo} className="bg-green-600 text-white px-10 py-3.5 rounded-full font-black shadow-lg hover:bg-green-700">SAVE VIDEO</button>
              <button onClick={() => setRecordedVideoUrl(null)} className="bg-white/10 text-white px-8 py-3.5 rounded-full font-bold hover:bg-white/20">DISCARD</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
