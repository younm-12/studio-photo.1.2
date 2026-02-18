import { AppProvider, useApp } from '@/context/AppContext';
import { Toaster } from '@/components/ui/sonner';
import Home from '@/sections/Home';
import TemplateSelection from '@/sections/TemplateSelection';
import PhotoCapture from '@/sections/PhotoCapture';
import PhotoEditor from '@/sections/PhotoEditor';

function AppContent() {
  const { currentView } = useApp();

  switch (currentView) {
    case 'home':
      return <Home />;
    case 'templates':
      return <TemplateSelection />;
    case 'capture':
      return <PhotoCapture />;
    case 'editor':
      return <PhotoEditor />;
    default:
      return <Home />;
  }
}

function App() {
  return (
    <AppProvider>
      <Toaster position="top-center" richColors />
      <AppContent />
    </AppProvider>
  );
}

export default App;
