import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, Trash2, Upload, X, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/context/AppContext';
import { getTemplates, addTemplate, deleteTemplate, type Template } from '@/lib/supabase';
import { toast } from 'sonner';

// Lazy image component with loading state
function LazyTemplateImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="w-full h-full relative bg-gray-100">
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Camera className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`w-full h-full object-cover transition-all duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />
    </div>
  );
}

export default function TemplateSelection() {
  const { setCurrentView, setSelectedTemplate } = useApp();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateFrameCount, setNewTemplateFrameCount] = useState(3);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [, setThumbnailFile] = useState<File | null>(null);
  const [templatePreview, setTemplatePreview] = useState<string>('');
  const [thumbnailPreview, setThumbnailPreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const templateInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load templates with abort controller for cleanup
  useEffect(() => {
    loadTemplates();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    abortControllerRef.current = new AbortController();
    
    try {
      const data = await getTemplates();
      if (!abortControllerRef.current.signal.aborted) {
        setTemplates(data);
      }
    } catch (error) {
      if (!abortControllerRef.current.signal.aborted) {
        toast.error('Failed to load templates');
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const handleTemplateFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setTemplateFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setTemplatePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplateName.trim() || !templateFile) {
      toast.error('Please fill in template name and select an image');
      return;
    }

    setIsUploading(true);
    
    try {
      // Compress image before uploading
      const compressedUrl = await compressImage(templateFile);
      
      if (!compressedUrl) {
        toast.error('Failed to process image');
        setIsUploading(false);
        return;
      }

      const newTemplate = await addTemplate({
        title: newTemplateName,
        description: `Photobooth template with ${newTemplateFrameCount} frames`,
        image_url: compressedUrl,
        thumbnail_url: thumbnailPreview || compressedUrl,
        frame_count: newTemplateFrameCount,
      });

      if (newTemplate) {
        toast.success('Template added successfully!');
        setTemplates(prev => [newTemplate, ...prev]);
        setIsAddDialogOpen(false);
        resetAddForm();
      } else {
        toast.error('Failed to add template');
      }
    } catch (error) {
      toast.error('Error adding template');
    }

    setIsUploading(false);
  };

  // Compress image to reduce size
  const compressImage = (file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e) => {
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }

          // Max dimensions
          const maxWidth = 1200;
          const maxHeight = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width *= ratio;
            height *= ratio;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.85 quality
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(null);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const resetAddForm = () => {
    setNewTemplateName('');
    setNewTemplateFrameCount(3);
    setTemplateFile(null);
    setThumbnailFile(null);
    setTemplatePreview('');
    setThumbnailPreview('');
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setDeletingId(id);
      const success = await deleteTemplate(id);
      if (success) {
        toast.success('Template deleted successfully!');
        setTemplates(prev => prev.filter(t => t.id !== id));
      } else {
        toast.error('Failed to delete template');
      }
      setDeletingId(null);
    }
  };

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setCurrentView('capture');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentView('home')}
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-800">Choose Template</h1>
          </div>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-gray-200 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No templates yet</h3>
            <p className="text-gray-500 mb-4">Add your first template to get started</p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-gradient-to-r from-pink-500 to-rose-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer"
                onClick={() => handleSelectTemplate(template)}
              >
                <div className="aspect-[3/4] relative overflow-hidden">
                  <LazyTemplateImage
                    src={template.thumbnail_url || template.image_url}
                    alt={template.title}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-gray-800 truncate">{template.title}</h3>
                  <p className="text-sm text-gray-500">{template.frame_count} frames</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(template.id);
                  }}
                  disabled={deletingId === template.id}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                >
                  {deletingId === template.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="templateName">Template Name</Label>
              <Input
                id="templateName"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Enter template name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="frameCount">Number of Frames</Label>
              <Input
                id="frameCount"
                type="number"
                min={1}
                max={10}
                value={newTemplateFrameCount}
                onChange={(e) => setNewTemplateFrameCount(parseInt(e.target.value) || 1)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Template Image</Label>
              <div
                onClick={() => templateInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-pink-400 transition-colors"
              >
                {templatePreview ? (
                  <div className="relative">
                    <img
                      src={templatePreview}
                      alt="Template preview"
                      className="w-full aspect-[3/4] object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTemplateFile(null);
                        setTemplatePreview('');
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload template image</p>
                    <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={templateInputRef}
                type="file"
                accept="image/*"
                onChange={handleTemplateFileChange}
                className="hidden"
              />
            </div>
            <div>
              <Label>Thumbnail Image (Optional)</Label>
              <div
                onClick={() => thumbnailInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-pink-400 transition-colors"
              >
                {thumbnailPreview ? (
                  <div className="relative">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setThumbnailFile(null);
                        setThumbnailPreview('');
                      }}
                      className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Click to upload thumbnail</p>
                  </div>
                )}
              </div>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                onChange={handleThumbnailFileChange}
                className="hidden"
              />
            </div>
            <Button
              onClick={handleAddTemplate}
              disabled={isUploading}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Add Template'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
