import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import MapViewer from './components/Map/MapViewer';
import CoordinatesScreen from './components/Coordinates/CoordinatesScreen';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapViewer />} />
        <Route path="/Coordinates" element={<CoordinatesScreen />} />
      </Routes>
    </Router>
  );
}

export default App;