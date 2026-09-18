import { useState } from 'react';
import { Arcade } from './game/Arcade';
import { MatrixLab } from './lab/MatrixLab';

type Route = 'arcade' | 'lab';

export function App() {
  const [route, setRoute] = useState<Route>('arcade');

  return (
    <div className="app">
      {route === 'lab' && (
        <header className="rail">
          <h1>Eigen Rush</h1>
          <button className="link" onClick={() => setRoute('arcade')}>
            Back to the game
          </button>
        </header>
      )}
      <main>{route === 'arcade' ? <Arcade onLab={() => setRoute('lab')} /> : <MatrixLab />}</main>
    </div>
  );
}
