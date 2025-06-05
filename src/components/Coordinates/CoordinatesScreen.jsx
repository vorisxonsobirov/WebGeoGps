import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function CoordinatesScreen() {
  const { state } = useLocation();
  const { logTable = [], totalDistance = 0 } = state || {};
  const navigate = useNavigate();

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distances = logTable.map((point, index) => {
    if (index === 0) return 0;
    const prevPoint = logTable[index - 1];
    return calculateDistance(prevPoint.latitude, prevPoint.longitude, point.latitude, point.longitude);
  });

  return (
    <div className="coordinates-container">
      <div className="button-container">
        <button className="button" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Назад</button>
      </div>
      <h1 className="header">Лог точек:</h1>
      {logTable.length === 0 ? (
        <p className="log-text">Нет записанных точек</p>
      ) : (
        <>
          {logTable.map((point, index) => (
            <p
              key={index}
              className={`log-text ${point.isManual ? 'manual-marker' : ''}`}
            >
              {`${point.isManual ? 'Моя метка' : 'Точка'} ${index + 1}: ${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)} (${new Date(point.timestamp).toLocaleTimeString()}) — ${distances[index].toFixed(1)} м`}
            </p>
          ))}
          <p className="total-distance">Общее расстояние: {totalDistance.toFixed(1)} м</p>
        </>
      )}
    </div>
  );
}

export default CoordinatesScreen;