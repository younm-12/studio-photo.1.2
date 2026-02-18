import { Camera, Images, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/context/AppContext';

export default function Home() {
  const { setCurrentView } = useApp();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-xl mb-6">
            <Camera className="w-12 h-12 text-pink-500" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent mb-4">
            PhotoBooth Studio
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            Capture your precious moments with our beautiful templates and creative editing tools
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-lg mx-auto">
          <Button
            onClick={() => setCurrentView('templates')}
            className="h-16 text-lg font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 shadow-lg hover:shadow-xl transition-all"
          >
            <Images className="w-5 h-5 mr-2" />
            Choose Template
          </Button>
          <Button
            onClick={() => setCurrentView('templates')}
            variant="outline"
            className="h-16 text-lg font-semibold border-2 border-purple-500 text-purple-600 hover:bg-purple-50"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Start Creating
          </Button>
        </div>

        <div className="mt-12 flex justify-center gap-8 text-gray-500">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-2">
              <span className="text-2xl">📸</span>
            </div>
            <span className="text-sm">Capture</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-2">
              <span className="text-2xl">✨</span>
            </div>
            <span className="text-sm">Edit</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-white rounded-full shadow flex items-center justify-center mb-2">
              <span className="text-2xl">💾</span>
            </div>
            <span className="text-sm">Save</span>
          </div>
        </div>
      </div>
    </div>
  );
}
