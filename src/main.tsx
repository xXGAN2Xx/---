import {createRoot} from 'react-dom/client';
import App from './AppFixed.tsx';
import { GameErrorBoundary } from './components/GameErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <GameErrorBoundary>
    <App />
  </GameErrorBoundary>,
);
