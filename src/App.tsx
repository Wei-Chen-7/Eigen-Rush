import { MatrixLab } from './lab/MatrixLab';

/**
 * Milestone 1 lands on the lab. The arcade loop arrives in milestone 2 and will
 * take over this shell, with the lab kept behind a link.
 */
export function App() {
  return (
    <div className="app">
      <header className="rail">
        <h1>Eigen Rush</h1>
        <span className="subtitle">Matrix lab</span>
      </header>
      <main>
        <MatrixLab />
      </main>
    </div>
  );
}
