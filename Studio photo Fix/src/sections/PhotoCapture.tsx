import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Camera, RefreshCw, Check, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

export default function PhotoCapture() {
  const { 
    setCurrentView, 
    selectedTemplate, 
    capturedPhotos, 
    addCapturedPhoto, 
    currentFrameIndex, 
    setCurrentFrameIndex,
  } = useApp();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize camera on mount - NEVER stop it
  useEffect(() => {
    initCamera();
    
    return () => {
      // Only cleanup on unmount, not between captures
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Re-initialize camera when returning from preview
  useEffect(() => {
    if (!previewPhoto && videoRef.current && streamRef.current) {
      // Ensure video is playing
      videoRef.current.play().catch(() => {
        // If play fails, reinitialize
        initCamera();
      });
    }
  }, [previewPhoto]);

  const initCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    
    try {
      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Get new stream with mobile-optimized constraints
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = async () => {
          try {
            await videoRef.current?.play();
            setIsInitializing(false);
          } catch (playError) {
            console.error('Play error:', playError);
            // Handle autoplay restrictions
            setTimeout(() => {
              videoRef.current?.play().catch(() => {});
            }, 100);
            setIsInitializing(false);
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Could not access camera. Please allow camera permissions.');
      setIsInitializing(false);
      
      // Auto-retry after 2 seconds
      retryTimeoutRef.current = setTimeout(() => {
        initCamera();
      }, 2000);
    }
  };

  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Ensure video is playing before capture
    if (video.paused) {
      try {
        await video.play();
      } catch (e) {
        console.error('Could not resume video:', e);
      }
    }

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Flip horizontally for mirror effect (selfie mode)
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPreviewPhoto(dataUrl);
    
    // DO NOT stop the stream - keep camera active!
  }, []);

  const startCountdown = () => {
    if (!videoRef.current || videoRef.current.paused) {
      // Try to resume video if paused
      videoRef.current?.play().catch(() => {
        initCamera();
      });
    }
    
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsCapturing(true);
          setTimeout(() => {
            capturePhoto();
            setIsCapturing(false);
            setCountdown(0);
          }, 200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAcceptPhoto = () => {
    if (previewPhoto) {
      addCapturedPhoto({
        id: Date.now().toString(),
        dataUrl: previewPhoto,
        frameIndex: currentFrameIndex,
      });
      
      const frameCount = selectedTemplate?.frame_count || 3;
      
      // Clear preview and continue to next frame
      setPreviewPhoto(null);
      
      if (currentFrameIndex < frameCount - 1) {
        setCurrentFrameIndex(currentFrameIndex + 1);
        // Camera stays active - NO reinitialization needed!
      } else {
        // All frames captured, go to editor
        setCurrentView('editor');
      }
    }
  };

  const handleRetake = () => {
    setPreviewPhoto(null);
    // Camera stays active - just resume video if needed
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play().catch(() => {
        initCamera();
      });
    }
  };

  const handleSkip = () => {
    const frameCount = selectedTemplate?.frame_count || 3;
    if (currentFrameIndex < frameCount - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
      setPreviewPhoto(null);
    } else {
      setCurrentView('editor');
    }
  };

  const handleBack = () => {
    setCurrentView('templates');
  };

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <p className="text-white mb-4 text-center">Please select a template first</p>
        <Button onClick={() => setCurrentView('templates')}>Go to Templates</Button>
      </div>
    );
  }

  const frameCount = selectedTemplate.frame_count || 3;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/70 backdrop-blur-sm z-10 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-white text-center">
          <p className="text-sm font-medium">Frame {currentFrameIndex + 1} of {frameCount}</p>
          <p className="text-xs opacity-60 truncate max-w-[150px]">{selectedTemplate.title}</p>
        </div>
        <Button
          variant="ghost"
          onClick={handleSkip}
          className="text-white hover:bg-white/20 text-sm"
        >
          Skip <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden p-2 sm:p-4">
        {cameraError ? (
          <div className="text-center p-4">
            <Camera className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-white mb-4">{cameraError}</p>
            <Button onClick={initCamera} className="bg-pink-500">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Camera
            </Button>
          </div>
        ) : previewPhoto ? (
          // Preview Mode
          <div className="relative w-full max-w-sm md:max-w-md flex flex-col items-center">
            <div className="relative w-full aspect-[3/4] max-h-[50vh] sm:max-h-[55vh] rounded-xl overflow-hidden shadow-2xl bg-gray-800">
              <img
                src={previewPhoto}
                alt="Preview"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-3 sm:gap-4 mt-4 sm:mt-6">
              <Button
                onClick={handleRetake}
                variant="outline"
                size="lg"
                className="bg-white/10 backdrop-blur text-white border-white/40 hover:bg-white/20"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Retake
              </Button>
              <Button
                onClick={handleAcceptPhoto}
                size="lg"
                className="bg-green-500 hover:bg-green-600"
              >
                <Check className="w-5 h-5 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        ) : (
          // Camera Mode
          <>
            {/* Camera Container - Responsive sizing */}
            <div className="relative w-full max-w-[280px] sm:max-w-sm md:max-w-md aspect-[3/4] max-h-[50vh] sm:max-h-[55vh] rounded-2xl overflow-hidden shadow-2xl bg-gray-800">
              {isInitializing && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-white text-sm">Starting camera...</p>
                  </div>
                </div>
              )}
              
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Frame Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[8%] border-2 border-dashed border-white/50 rounded-lg" />
                <div className="absolute top-[8%] left-[8%] w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-l-4 border-pink-500" />
                <div className="absolute top-[8%] right-[8%] w-6 h-6 sm:w-8 sm:h-8 border-t-4 border-r-4 border-pink-500" />
                <div className="absolute bottom-[8%] left-[8%] w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-l-4 border-pink-500" />
                <div className="absolute bottom-[8%] right-[8%] w-6 h-6 sm:w-8 sm:h-8 border-b-4 border-r-4 border-pink-500" />
              </div>

              {/* Flash Effect */}
              {isCapturing && (
                <div className="absolute inset-0 bg-white animate-pulse z-20" />
              )}
            </div>

            {/* Countdown Overlay */}
            {countdown > 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
                <span className="text-7xl sm:text-8xl md:text-9xl font-bold text-white animate-bounce">
                  {countdown}
                </span>
              </div>
            )}

            {/* Capture Button */}
            <div className="mt-4 sm:mt-6 flex items-center justify-center gap-6 sm:gap-8">
              <div className="w-10 sm:w-12" />
              <button
                onClick={startCountdown}
                disabled={countdown > 0 || isCapturing || isInitializing}
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-white border-4 border-gray-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-500" />
              </button>
              <div className="w-10 sm:w-12 flex justify-center">
                <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-white/50" />
              </div>
            </div>

            <p className="text-white/50 text-xs sm:text-sm mt-3">
              Tap to capture
            </p>
          </>
        )}
      </div>

      {/* Frame Progress */}
      <div className="p-2 sm:p-3 bg-black/70 backdrop-blur-sm flex-shrink-0">
        <div className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto max-w-full px-2">
          {[...Array(frameCount)].map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg border-2 flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                i === currentFrameIndex && !previewPhoto
                  ? 'border-pink-500 bg-pink-500/30 text-pink-400 scale-110'
                  : i < capturedPhotos.length
                  ? 'border-green-500 bg-green-500/30 text-green-400'
                  : 'border-gray-600 bg-gray-800/50 text-gray-500'
              }`}
            >
              {i < capturedPhotos.length ? (
                <img
                  src={capturedPhotos[i].dataUrl}
                  alt={`Frame ${i + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
