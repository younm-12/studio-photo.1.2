import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Template, CapturedPhoto, TextElement, PlacedSticker, PhotoEdit } from '@/types';

type AppView = 'home' | 'templates' | 'capture' | 'editor' | 'result';

interface AppContextType {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedTemplate: Template | null;
  setSelectedTemplate: (template: Template | null) => void;
  capturedPhotos: CapturedPhoto[];
  setCapturedPhotos: (photos: CapturedPhoto[]) => void;
  addCapturedPhoto: (photo: CapturedPhoto) => void;
  currentFrameIndex: number;
  setCurrentFrameIndex: (index: number) => void;
  textElements: TextElement[];
  setTextElements: (elements: TextElement[]) => void;
  addTextElement: (element: TextElement) => void;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  removeTextElement: (id: string) => void;
  placedStickers: PlacedSticker[];
  setPlacedStickers: (stickers: PlacedSticker[]) => void;
  addPlacedSticker: (sticker: PlacedSticker) => void;
  updatePlacedSticker: (id: string, updates: Partial<PlacedSticker>) => void;
  removePlacedSticker: (id: string) => void;
  photoEdit: PhotoEdit;
  setPhotoEdit: (edit: PhotoEdit) => void;
  updatePhotoEdit: (updates: Partial<PhotoEdit>) => void;
  resetSession: () => void;
}

const defaultPhotoEdit: PhotoEdit = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  blur: 0,
  filter: 'none',
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<CapturedPhoto[]>([]);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [placedStickers, setPlacedStickers] = useState<PlacedSticker[]>([]);
  const [photoEdit, setPhotoEdit] = useState<PhotoEdit>(defaultPhotoEdit);

  const addCapturedPhoto = useCallback((photo: CapturedPhoto) => {
    setCapturedPhotos(prev => [...prev, photo]);
  }, []);

  const addTextElement = useCallback((element: TextElement) => {
    setTextElements(prev => [...prev, element]);
  }, []);

  const updateTextElement = useCallback((id: string, updates: Partial<TextElement>) => {
    setTextElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  }, []);

  const removeTextElement = useCallback((id: string) => {
    setTextElements(prev => prev.filter(el => el.id !== id));
  }, []);

  const addPlacedSticker = useCallback((sticker: PlacedSticker) => {
    setPlacedStickers(prev => [...prev, sticker]);
  }, []);

  const updatePlacedSticker = useCallback((id: string, updates: Partial<PlacedSticker>) => {
    setPlacedStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const removePlacedSticker = useCallback((id: string) => {
    setPlacedStickers(prev => prev.filter(s => s.id !== id));
  }, []);

  const updatePhotoEdit = useCallback((updates: Partial<PhotoEdit>) => {
    setPhotoEdit(prev => ({ ...prev, ...updates }));
  }, []);

  const resetSession = useCallback(() => {
    setSelectedTemplate(null);
    setCapturedPhotos([]);
    setCurrentFrameIndex(0);
    setTextElements([]);
    setPlacedStickers([]);
    setPhotoEdit(defaultPhotoEdit);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setCurrentView,
        selectedTemplate,
        setSelectedTemplate,
        capturedPhotos,
        setCapturedPhotos,
        addCapturedPhoto,
        currentFrameIndex,
        setCurrentFrameIndex,
        textElements,
        setTextElements,
        addTextElement,
        updateTextElement,
        removeTextElement,
        placedStickers,
        setPlacedStickers,
        addPlacedSticker,
        updatePlacedSticker,
        removePlacedSticker,
        photoEdit,
        setPhotoEdit,
        updatePhotoEdit,
        resetSession,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
