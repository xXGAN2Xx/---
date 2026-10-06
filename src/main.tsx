import {createRoot} from 'react-dom/client';
import App from './AppStable3.tsx';
import { GameErrorBoundary } from './components/GameErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <GameErrorBoundary>
    <App />
  </GameErrorBoundary>,
);
