import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://srmfpdxuqqrdhrnjarsj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNybWZwZHh1cXFyZGhybmphcnNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDU3NjUsImV4cCI6MjA4NjU4MTc2NX0.s5uQIm5Gdshe5P2M8AmJtVFk9RobaFtLITdtHJ_oD1M';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Template = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  year: number;
  created_at: string;
  frame_count: number;
};

// Parse frame count from description
function parseFrameCount(description: string): number {
  const match = description.match(/(\d+)\s*frames?/i);
  return match ? parseInt(match[1]) : 3;
}

export async function getTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('Photobox')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  
  // Transform data to match our Template type
  return (data || []).map(item => ({
    id: item.id,
    title: item.title,
    description: item.description,
    image_url: item.image_url,
    thumbnail_url: item.image_url, // Using same image as thumbnail
    year: item.year,
    created_at: item.created_at,
    frame_count: parseFrameCount(item.description),
  }));
}

export async function addTemplate(template: Omit<Template, 'id' | 'created_at' | 'year'>): Promise<Template | null> {
  const { data, error } = await supabase
    .from('Photobox')
    .insert([{
      title: template.title,
      description: template.description,
      image_url: template.image_url,
      year: new Date().getFullYear(),
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding template:', error);
    return null;
  }
  
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    image_url: data.image_url,
    thumbnail_url: data.image_url,
    year: data.year,
    created_at: data.created_at,
    frame_count: parseFrameCount(data.description),
  };
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('Photobox')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting template:', error);
    return false;
  }
  
  return true;
}

// Since we can't create storage buckets with anon key, we'll use base64 data URLs
export async function uploadImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}
