// src/App.jsx
import { useState } from 'react';
import Header from './components/Header';
import Home from './pages/Home';
import './App.css'; // Importing your styles

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <Header />
      <Home />
      <div className="card">
        <button onClick={() => setCount(count + 1)}>
          count is {count}
        </button>
      </div>
    </div>
  );
}

export default App;
