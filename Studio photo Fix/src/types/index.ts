export interface Template {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  year: number;
  created_at: string;
  frame_count: number;
}

export interface CapturedPhoto {
  id: string;
  dataUrl: string;
  frameIndex: number;
}

export interface Sticker {
  id: string;
  url: string;
  category: string;
  name: string;
}

export interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  font: string;
  size: number;
  color: string;
  rotation: number;
}

export interface PlacedSticker {
  id: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface PhotoEdit {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  filter: string;
}

export type AppView = 'home' | 'templates' | 'capture' | 'editor' | 'result';
