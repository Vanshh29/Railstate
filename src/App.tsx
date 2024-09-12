import React from 'react';
import Map from './components/Map/Map';

const App: React.FC = () => {
  return (
    <div className="App">
      <header className="p-4 bg-gray-800 text-white text-center">
        <h1 className="text-2xl">Railway Line Viewer</h1>
      </header>
      <main className="p-4">
        <Map />
      </main>
    </div>
  );
};

export default App;
