import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Download, Type, Image as ImageIcon, Sliders, Smile, RotateCcw, Plus, Crop, Move, ZoomIn, ZoomOut, Check, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

// Built-in stickers
const stickerCategories = [
  { name: 'Cute', stickers: ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🐨', '🐯', '🦁', '🐷', '🐸', '🐙', '🦄', '🐝', '🦋', '🐞'] },
  { name: 'Hearts', stickers: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💕', '💞', '💘', '💝'] },
  { name: 'Stars', stickers: ['⭐', '🌟', '✨', '💫', '🌠', '☄️', '🌙', '☀️', '🌞', '🌛', '🌜', '⚡', '🔥', '💥', '🎆', '🎇'] },
  { name: 'Flowers', stickers: ['🌸', '🌺', '🌻', '🌹', '🌷', '💐', '🌼', '🌵', '🌿', '☘️', '🍀', '🍃', '🍁', '🍂', '🌾', '🌲'] },
  { name: 'Food', stickers: ['🍕', '🍔', '🍟', '🌭', '🍿', '🧂', '🥓', '🥚', '🧇', '🥞', '🧈', '🍞', '🥐', '🥨', '🥯', '🥖'] },
  { name: 'Drinks', stickers: ['☕', '🍵', '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🧊', '🥛', '🫗'] },
  { name: 'Celebration', stickers: ['🎉', '🎊', '🎈', '🎂', '🎁', '🎄', '🎃', '🎅', '🤶', '🧑‍🎄', '🎆', '🎇', '✨', '🎀', '🎗️', '🎪'] },
  { name: 'Faces', stickers: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩'] },
];

const fonts = [
  'Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
  'Impact', 'Comic Sans MS', 'Trebuchet MS', 'Palatino Linotype', 'Tahoma',
  'Lucida Console', 'Garamond', 'Bookman Old Style', 'Arial Black', 'Century Gothic',
  'Franklin Gothic Medium', 'Rockwell', 'Cambria', 'Constantia', 'Segoe UI'
];

const filters = [
  { name: 'None', value: 'none' },
  { name: 'Grayscale', value: 'grayscale(100%)' },
  { name: 'Sepia', value: 'sepia(100%)' },
  { name: 'Vintage', value: 'sepia(50%) contrast(1.2)' },
  { name: 'Bright', value: 'brightness(1.3)' },
  { name: 'Dark', value: 'brightness(0.7)' },
  { name: 'High Contrast', value: 'contrast(1.5)' },
  { name: 'Warm', value: 'sepia(30%) saturate(1.5)' },
  { name: 'Cool', value: 'hue-rotate(180deg) saturate(0.8)' },
  { name: 'Dreamy', value: 'brightness(1.1) saturate(1.3) blur(0.5px)' },
];

// Load custom stickers from localStorage
const loadCustomStickers = (): string[] => {
  try {
    const saved = localStorage.getItem('photobooth_custom_stickers');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Save custom stickers to localStorage
const saveCustomStickers = (stickers: string[]) => {
  try {
    localStorage.setItem('photobooth_custom_stickers', JSON.stringify(stickers));
  } catch {
    toast.error('Failed to save sticker');
  }
};

interface DraggablePhoto {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  cropX: number;
  cropY: number;
  cropScale: number;
}

interface CropState {
  isActive: boolean;
  photoId: string | null;
  imageOffsetX: number;
  imageOffsetY: number;
  imageScale: number;
}

export default function PhotoEditor() {
  const { 
    setCurrentView, 
    selectedTemplate, 
    capturedPhotos, 
    photoEdit, 
    updatePhotoEdit,
    textElements,
    addTextElement,
    updateTextElement,
    removeTextElement,
    placedStickers,
    addPlacedSticker,
    updatePlacedSticker,
    removePlacedSticker,
  } = useApp();

  const canvasRef = useRef<HTMLDivElement>(null);
  const cropContainerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('stickers');
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [resolution, setResolution] = useState<'1x' | '2x' | '4x'>('2x');
  const [isSaving, setIsSaving] = useState(false);
  const [customStickers, setCustomStickers] = useState<string[]>([]);
  const [isAddingSticker, setIsAddingSticker] = useState(false);
  
  // Crop state
  const [cropState, setCropState] = useState<CropState>({
    isActive: false,
    photoId: null,
    imageOffsetX: 0,
    imageOffsetY: 0,
    imageScale: 1,
  });

  // Draggable photos state
  const [draggablePhotos, setDraggablePhotos] = useState<Record<string, DraggablePhoto>>(() => {
    const initial: Record<string, DraggablePhoto> = {};
    capturedPhotos.forEach((photo, index) => {
      initial[photo.id] = {
        id: photo.id,
        x: 27.5 + (index % 2) * 45,
        y: 27.5 + Math.floor(index / 2) * 30,
        scale: 1,
        rotation: 0,
        cropX: 0,
        cropY: 0,
        cropScale: 1,
      };
    });
    return initial;
  });

  const dragRef = useRef<{ 
    id: string; 
    type: 'text' | 'sticker' | 'photo'; 
    startX: number; 
    startY: number; 
    itemStartX: number; 
    itemStartY: number;
  } | null>(null);

  // Load custom stickers on mount
  useEffect(() => {
    setCustomStickers(loadCustomStickers());
  }, []);

  const handleAddSticker = (emoji: string) => {
    const id = Date.now().toString();
    addPlacedSticker({
      id,
      url: emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    });
  };

  const handleAddCustomSticker = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Sticker image should be less than 2MB');
      return;
    }

    setIsAddingSticker(true);
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newStickers = [...customStickers, dataUrl];
      setCustomStickers(newStickers);
      saveCustomStickers(newStickers);
      toast.success('Sticker added!');
      setIsAddingSticker(false);
    };
    reader.onerror = () => {
      toast.error('Failed to load sticker');
      setIsAddingSticker(false);
    };
    reader.readAsDataURL(file);
  };

  const handleAddText = () => {
    const id = Date.now().toString();
    addTextElement({
      id,
      text: 'Double click to edit',
      x: 50,
      y: 50,
      font: 'Arial',
      size: 24,
      color: '#000000',
      rotation: 0,
    });
    setSelectedTextId(id);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, id: string, type: 'text' | 'sticker' | 'photo') => {
    if (cropState.isActive) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const isTouch = 'touches' in e;
    const clientX = isTouch ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = isTouch ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    let item;
    if (type === 'text') {
      item = textElements.find(t => t.id === id);
    } else if (type === 'sticker') {
      item = placedStickers.find(s => s.id === id);
    } else {
      item = draggablePhotos[id];
    }
    
    if (!item) return;

    dragRef.current = {
      id,
      type,
      startX: clientX,
      startY: clientY,
      itemStartX: item.x,
      itemStartY: item.y,
    };

    if (type === 'text') setSelectedTextId(id);
    else if (type === 'sticker') setSelectedStickerId(id);
    else setSelectedPhotoId(id);
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragRef.current || cropState.isActive) return;

    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as TouchEvent).touches[0]?.clientX : (e as MouseEvent).clientX;
    const clientY = isTouch ? (e as TouchEvent).touches[0]?.clientY : (e as MouseEvent).clientY;
    
    if (!clientX || !clientY) return;

    const { id, type, startX, startY, itemStartX, itemStartY } = dragRef.current;
    const deltaX = ((clientX - startX) / (canvasRef.current?.offsetWidth || 1)) * 100;
    const deltaY = ((clientY - startY) / (canvasRef.current?.offsetHeight || 1)) * 100;

    const newX = Math.max(-20, Math.min(120, itemStartX + deltaX));
    const newY = Math.max(-20, Math.min(120, itemStartY + deltaY));

    if (type === 'text') {
      updateTextElement(id, { x: newX, y: newY });
    } else if (type === 'sticker') {
      updatePlacedSticker(id, { x: newX, y: newY });
    } else {
      setDraggablePhotos(prev => ({
        ...prev,
        [id]: { ...prev[id], x: newX, y: newY }
      }));
    }
  }, [updateTextElement, updatePlacedSticker, cropState.isActive]);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Crop functions
  const startCrop = (photoId: string) => {
    const photo = draggablePhotos[photoId];
    if (!photo) return;
    
    setCropState({
      isActive: true,
      photoId,
      imageOffsetX: photo.cropX,
      imageOffsetY: photo.cropY,
      imageScale: photo.cropScale,
    });
    setSelectedPhotoId(photoId);
  };

  const handleCropDrag = (e: MouseEvent | TouchEvent) => {
    if (!cropState.isActive || !cropState.photoId) return;
    
    const isTouch = 'touches' in e;
    const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = isTouch ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    
    const container = cropContainerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const offsetX = ((clientX - centerX) / rect.width) * 100;
    const offsetY = ((clientY - centerY) / rect.height) * 100;
    
    setCropState(prev => ({
      ...prev,
      imageOffsetX: offsetX,
      imageOffsetY: offsetY,
    }));
  };

  const handleCropZoom = (delta: number) => {
    setCropState(prev => ({
      ...prev,
      imageScale: Math.max(0.5, Math.min(3, prev.imageScale + delta)),
    }));
  };

  const applyCrop = () => {
    if (!cropState.photoId) return;
    
    setDraggablePhotos(prev => ({
      ...prev,
      [cropState.photoId!]: {
        ...prev[cropState.photoId!],
        cropX: cropState.imageOffsetX,
        cropY: cropState.imageOffsetY,
        cropScale: cropState.imageScale,
      }
    }));
    
    setCropState({
      isActive: false,
      photoId: null,
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageScale: 1,
    });
    
    toast.success('Crop applied!');
  };

  const cancelCrop = () => {
    setCropState({
      isActive: false,
      photoId: null,
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageScale: 1,
    });
  };

  const updatePhotoPosition = (photoId: string, updates: Partial<DraggablePhoto>) => {
    setDraggablePhotos(prev => ({
      ...prev,
      [photoId]: { ...prev[photoId], ...updates }
    }));
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    
    setIsSaving(true);
    try {
      const scale = resolution === '1x' ? 1 : resolution === '2x' ? 2 : 4;
      const canvas = await html2canvas(canvasRef.current, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
      });
      
      const link = document.createElement('a');
      link.download = `photobooth_${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast.success('Photo saved successfully!');
      setIsSaveDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save photo');
    }
    setIsSaving(false);
  };

  const getFilterStyle = () => {
    const { brightness, contrast, saturation, blur, filter } = photoEdit;
    let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    if (blur > 0) filterString += ` blur(${blur}px)`;
    if (filter !== 'none') filterString += ` ${filter}`;
    return filterString;
  };

  if (!selectedTemplate || capturedPhotos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4">
        <p className="text-white mb-4">No photos to edit</p>
        <Button onClick={() => setCurrentView('templates')}>Go to Templates</Button>
      </div>
    );
  }

  const currentCropPhoto = cropState.photoId ? capturedPhotos.find(p => p.id === cropState.photoId) : null;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-800 border-b border-gray-700 flex-shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentView('capture')}
          className="text-white hover:bg-gray-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-white font-semibold text-sm sm:text-base">Edit Photo</h1>
        <Button
          onClick={() => setIsSaveDialogOpen(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-xs sm:text-sm"
        >
          <Download className="w-4 h-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 p-2 sm:p-4 flex items-center justify-center bg-gray-950 overflow-auto">
          <div
            ref={canvasRef}
            className="relative"
            style={{
              width: '100%',
              maxWidth: 'min(500px, 90vw)',
              aspectRatio: '3/4',
            }}
          >
            {/* Layer 1: Photos (Bottom layer - behind template) */}
            {capturedPhotos.map((photo) => {
              const pos = draggablePhotos[photo.id] || { x: 50, y: 50, scale: 1, rotation: 0, cropX: 0, cropY: 0, cropScale: 1 };
              return (
                <div
                  key={photo.id}
                  className={`absolute overflow-hidden cursor-move touch-none ${selectedPhotoId === photo.id ? 'ring-2 ring-pink-500 z-10' : 'z-0'}`}
                  style={{
                    left: `${pos.x}%`,
                    top: `${pos.y}%`,
                    width: '45%',
                    height: '45%',
                    transform: `translate(-50%, -50%) scale(${pos.scale}) rotate(${pos.rotation}deg)`,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, photo.id, 'photo')}
                  onTouchStart={(e) => handleMouseDown(e, photo.id, 'photo')}
                  onClick={() => setSelectedPhotoId(photo.id)}
                >
                  <div 
                    className="w-full h-full"
                    style={{
                      transform: `translate(${pos.cropX}%, ${pos.cropY}%) scale(${pos.cropScale})`,
                    }}
                  >
                    <img
                      src={photo.dataUrl}
                      alt="Captured"
                      className="w-full h-full object-cover"
                      style={{ filter: getFilterStyle() }}
                      draggable={false}
                    />
                  </div>
                </div>
              );
            })}

            {/* Layer 2: Template (Middle layer) */}
            <img
              src={selectedTemplate.image_url}
              alt="Template"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              style={{ zIndex: 50 }}
              crossOrigin="anonymous"
            />

            {/* Layer 3: Stickers (Top layer) */}
            {placedStickers.map((sticker) => (
              <div
                key={sticker.id}
                className={`absolute cursor-move select-none touch-none text-3xl sm:text-4xl ${selectedStickerId === sticker.id ? 'ring-2 ring-pink-500' : ''}`}
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation}deg)`,
                  zIndex: 100,
                }}
                onMouseDown={(e) => handleMouseDown(e, sticker.id, 'sticker')}
                onTouchStart={(e) => handleMouseDown(e, sticker.id, 'sticker')}
                onClick={() => setSelectedStickerId(sticker.id)}
              >
                {sticker.url.startsWith('data:') ? (
                  <img src={sticker.url} alt="sticker" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                ) : (
                  sticker.url
                )}
              </div>
            ))}

            {/* Layer 4: Text (Top layer) */}
            {textElements.map((text) => (
              <div
                key={text.id}
                className={`absolute cursor-move select-none touch-none ${selectedTextId === text.id ? 'ring-2 ring-pink-500' : ''}`}
                style={{
                  left: `${text.x}%`,
                  top: `${text.y}%`,
                  transform: `translate(-50%, -50%) rotate(${text.rotation}deg)`,
                  fontFamily: text.font,
                  fontSize: `${Math.max(14, Math.min(48, text.size * (window.innerWidth < 640 ? 0.7 : 1)))}px`,
                  color: text.color,
                  zIndex: 100,
                  textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                }}
                onMouseDown={(e) => handleMouseDown(e, text.id, 'text')}
                onTouchStart={(e) => handleMouseDown(e, text.id, 'text')}
                onClick={() => setSelectedTextId(text.id)}
                onDoubleClick={() => {
                  const newText = prompt('Enter text:', text.text);
                  if (newText !== null) {
                    updateTextElement(text.id, { text: newText });
                  }
                }}
              >
                {text.text}
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-72 xl:w-80 bg-gray-800 border-l border-gray-700 flex flex-col flex-shrink-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid grid-cols-5 bg-gray-900 flex-shrink-0">
              <TabsTrigger value="stickers" className="data-[state=active]:bg-gray-700 p-2">
                <Smile className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-gray-700 p-2">
                <Type className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="filters" className="data-[state=active]:bg-gray-700 p-2">
                <Sliders className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="adjust" className="data-[state=active]:bg-gray-700 p-2">
                <ImageIcon className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="photos" className="data-[state=active]:bg-gray-700 p-2">
                <Move className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              <TabsContent value="stickers" className="p-3 sm:p-4 m-0">
                {/* Add Custom Sticker */}
                <div className="mb-4">
                  <label className="block w-full">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAddCustomSticker(file);
                      }}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center gap-2 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors">
                      {isAddingSticker ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-white" />
                      )}
                      <span className="text-white text-sm">Add from Gallery</span>
                    </div>
                  </label>
                </div>

                {/* Custom Stickers */}
                {customStickers.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-white text-sm font-medium mb-2">My Stickers</h3>
                    <div className="grid grid-cols-5 gap-1">
                      {customStickers.map((sticker, i) => (
                        <button
                          key={i}
                          onClick={() => handleAddSticker(sticker)}
                          className="aspect-square hover:bg-gray-700 rounded p-1 transition-colors"
                        >
                          <img src={sticker} alt="" className="w-full h-full object-contain" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Built-in Stickers - Scrollable Categories */}
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  {stickerCategories.map((category) => (
                    <div key={category.name} className="mb-4">
                      <h3 className="text-white text-sm font-medium mb-2 sticky top-0 bg-gray-800 py-1">{category.name}</h3>
                      <div className="grid grid-cols-6 gap-1">
                        {category.stickers.map((sticker, i) => (
                          <button
                            key={i}
                            onClick={() => handleAddSticker(sticker)}
                            className="text-xl sm:text-2xl hover:bg-gray-700 rounded p-1 transition-colors"
                          >
                            {sticker}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>

                {selectedStickerId && (
                  <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                    <h4 className="text-white text-sm font-medium mb-2">Selected Sticker</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-gray-400 text-xs">Scale</label>
                        <Slider
                          value={[placedStickers.find(s => s.id === selectedStickerId)?.scale || 1]}
                          onValueChange={([v]) => updatePlacedSticker(selectedStickerId, { scale: v })}
                          min={0.3}
                          max={4}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-xs">Rotation</label>
                        <Slider
                          value={[placedStickers.find(s => s.id === selectedStickerId)?.rotation || 0]}
                          onValueChange={([v]) => updatePlacedSticker(selectedStickerId, { rotation: v })}
                          min={-180}
                          max={180}
                          step={5}
                        />
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          removePlacedSticker(selectedStickerId);
                          setSelectedStickerId(null);
                        }}
                        className="w-full"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="text" className="p-3 sm:p-4 m-0">
                <Button onClick={handleAddText} className="w-full mb-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Text
                </Button>
                
                {selectedTextId && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-xs">Font</label>
                      <select
                        value={textElements.find(t => t.id === selectedTextId)?.font}
                        onChange={(e) => updateTextElement(selectedTextId, { font: e.target.value })}
                        className="w-full mt-1 bg-gray-700 text-white rounded px-2 py-1 text-sm"
                      >
                        {fonts.map(font => (
                          <option key={font} value={font}>{font}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Size</label>
                      <Slider
                        value={[textElements.find(t => t.id === selectedTextId)?.size || 24]}
                        onValueChange={([v]) => updateTextElement(selectedTextId, { size: v })}
                        min={12}
                        max={72}
                        step={2}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Color</label>
                      <input
                        type="color"
                        value={textElements.find(t => t.id === selectedTextId)?.color}
                        onChange={(e) => updateTextElement(selectedTextId, { color: e.target.value })}
                        className="w-full mt-1 h-8 rounded"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 text-xs">Rotation</label>
                      <Slider
                        value={[textElements.find(t => t.id === selectedTextId)?.rotation || 0]}
                        onValueChange={([v]) => updateTextElement(selectedTextId, { rotation: v })}
                        min={-180}
                        max={180}
                        step={5}
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        removeTextElement(selectedTextId);
                        setSelectedTextId(null);
                      }}
                      className="w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Text
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="filters" className="p-3 sm:p-4 m-0">
                <div className="grid grid-cols-2 gap-2">
                  {filters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => updatePhotoEdit({ filter: filter.value })}
                      className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm transition-colors ${
                        photoEdit.filter === filter.value
                          ? 'bg-pink-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {filter.name}
                    </button>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="adjust" className="p-3 sm:p-4 m-0 space-y-4">
                <div>
                  <label className="text-gray-400 text-xs flex justify-between">
                    <span>Brightness</span>
                    <span>{photoEdit.brightness}%</span>
                  </label>
                  <Slider
                    value={[photoEdit.brightness]}
                    onValueChange={([v]) => updatePhotoEdit({ brightness: v })}
                    min={50}
                    max={150}
                    step={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs flex justify-between">
                    <span>Contrast</span>
                    <span>{photoEdit.contrast}%</span>
                  </label>
                  <Slider
                    value={[photoEdit.contrast]}
                    onValueChange={([v]) => updatePhotoEdit({ contrast: v })}
                    min={50}
                    max={150}
                    step={5}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs flex justify-between">
                    <span>Saturation</span>
                    <span>{photoEdit.saturation}%</span>
                  </label>
                  <Slider
                    value={[photoEdit.saturation]}
                    onValueChange={([v]) => updatePhotoEdit({ saturation: v })}
                    min={0}
                    max={200}
                    step={10}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-gray-400 text-xs flex justify-between">
                    <span>Blur</span>
                    <span>{photoEdit.blur}px</span>
                  </label>
                  <Slider
                    value={[photoEdit.blur]}
                    onValueChange={([v]) => updatePhotoEdit({ blur: v })}
                    min={0}
                    max={10}
                    step={0.5}
                    className="mt-1"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => updatePhotoEdit({ brightness: 100, contrast: 100, saturation: 100, blur: 0 })}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </TabsContent>

              <TabsContent value="photos" className="p-3 sm:p-4 m-0">
                <div className="space-y-4">
                  <p className="text-gray-400 text-xs sm:text-sm">Tap a photo on canvas to select and adjust</p>
                  
                  {selectedPhotoId && draggablePhotos[selectedPhotoId] && (
                    <div className="p-3 bg-gray-700 rounded-lg space-y-3">
                      <h4 className="text-white text-sm font-medium">Selected Photo</h4>
                      
                      <div>
                        <label className="text-gray-400 text-xs">Scale</label>
                        <Slider
                          value={[draggablePhotos[selectedPhotoId]?.scale || 1]}
                          onValueChange={([v]) => updatePhotoPosition(selectedPhotoId, { scale: v })}
                          min={0.3}
                          max={2}
                          step={0.1}
                        />
                      </div>
                      
                      <div>
                        <label className="text-gray-400 text-xs">Rotation</label>
                        <Slider
                          value={[draggablePhotos[selectedPhotoId]?.rotation || 0]}
                          onValueChange={([v]) => updatePhotoPosition(selectedPhotoId, { rotation: v })}
                          min={-180}
                          max={180}
                          step={5}
                        />
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startCrop(selectedPhotoId)}
                        className="w-full"
                      >
                        <Crop className="w-4 h-4 mr-2" />
                        Crop Photo
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updatePhotoPosition(selectedPhotoId, { x: 50, y: 50, scale: 1, rotation: 0, cropX: 0, cropY: 0, cropScale: 1 })}
                        className="w-full"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Reset All
                      </Button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-gray-400 text-xs">All Photos:</p>
                    {capturedPhotos.map((photo, index) => (
                      <div 
                        key={photo.id}
                        onClick={() => setSelectedPhotoId(photo.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                          selectedPhotoId === photo.id ? 'bg-pink-500/30 border border-pink-500' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        <img src={photo.dataUrl} alt="" className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded" />
                        <span className="text-white text-sm">Photo {index + 1}</span>
                        <Move className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white">Save Photo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-gray-400 text-sm mb-2 block">Resolution</label>
            <div className="grid grid-cols-3 gap-2">
              {(['1x', '2x', '4x'] as const).map((res) => (
                <button
                  key={res}
                  onClick={() => setResolution(res)}
                  className={`p-3 rounded-lg text-sm transition-colors ${
                    resolution === res
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              Higher resolution = Better quality but larger file size
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsSaveDialogOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500"
            >
              {isSaving ? 'Saving...' : 'Download'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog - Direct Image Manipulation */}
      <Dialog open={cropState.isActive} onOpenChange={(open) => !open && cancelCrop()}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-[95vw] sm:max-w-md p-3 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-white text-base sm:text-lg">Crop Photo</DialogTitle>
          </DialogHeader>
          
          <div className="py-2 sm:py-4 space-y-3 sm:space-y-4">
            <p className="text-gray-400 text-xs sm:text-sm">
              Drag to move, use buttons to zoom
            </p>
            
            {/* Crop Container */}
            <div 
              ref={cropContainerRef}
              className="relative w-full aspect-square bg-gray-900 rounded-lg overflow-hidden cursor-move touch-none"
              onMouseDown={() => {
                const handleMove = (ev: MouseEvent) => handleCropDrag(ev);
                const handleUp = () => {
                  document.removeEventListener('mousemove', handleMove);
                  document.removeEventListener('mouseup', handleUp);
                };
                document.addEventListener('mousemove', handleMove);
                document.addEventListener('mouseup', handleUp);
              }}
              onTouchStart={() => {
                const handleMove = (ev: TouchEvent) => handleCropDrag(ev);
                const handleUp = () => {
                  document.removeEventListener('touchmove', handleMove);
                  document.removeEventListener('touchend', handleUp);
                };
                document.addEventListener('touchmove', handleMove);
                document.addEventListener('touchend', handleUp);
              }}
              onWheel={(e) => {
                e.preventDefault();
                handleCropZoom(e.deltaY > 0 ? -0.1 : 0.1);
              }}
            >
              {currentCropPhoto && (
                <div 
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `translate(${cropState.imageOffsetX}%, ${cropState.imageOffsetY}%) scale(${cropState.imageScale})`,
                  }}
                >
                  <img 
                    src={currentCropPhoto.dataUrl} 
                    alt="Crop preview"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              )}
              
              {/* Crop Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-[15%] border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                <div className="absolute top-[15%] left-[15%] w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-l-2 border-pink-500" />
                <div className="absolute top-[15%] right-[15%] w-4 h-4 sm:w-6 sm:h-6 border-t-2 border-r-2 border-pink-500" />
                <div className="absolute bottom-[15%] left-[15%] w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-l-2 border-pink-500" />
                <div className="absolute bottom-[15%] right-[15%] w-4 h-4 sm:w-6 sm:h-6 border-b-2 border-r-2 border-pink-500" />
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCropZoom(-0.2)}
                className="w-10 h-10 sm:w-12 sm:h-12"
              >
                <ZoomOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">
                {Math.round(cropState.imageScale * 100)}%
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCropZoom(0.2)}
                className="w-10 h-10 sm:w-12 sm:h-12"
              >
                <ZoomIn className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={cancelCrop}
              className="flex-1 text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={applyCrop}
              className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-sm"
            >
              <Check className="w-4 h-4 mr-1 sm:mr-2" />
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
