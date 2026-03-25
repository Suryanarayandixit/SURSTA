import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DrawingRoom from './pages/DrawingRoom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Pehle ye page dikhega jahan naam dalna hai */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Join karne ke baad ye page dikhega */}
        <Route path="/draw/:roomId" element={<DrawingRoom />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;