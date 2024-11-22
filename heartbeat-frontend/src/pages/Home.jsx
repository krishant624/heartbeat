// src/pages/Home.jsx
import React from 'react';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <h2>Welcome to HeartBeat</h2>
      <p>Your favorite dating app is just a click away.</p>
      <div className="cta-buttons">
        <button className="btn primary">Login</button>
        <button className="btn secondary">Signup</button>
      </div>
    </div>
  );
}

export default Home;
