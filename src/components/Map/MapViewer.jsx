import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';

function MapViewer() {
  const [location, setLocation] = useState(null);
  const [logTable, setLogTable] = useState([]);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
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

  const fetchRoute = async (points) => {
    const filteredPoints = points.filter((point, index, arr) =>
      index === 0 || !(point.latitude === arr[index - 1].latitude && point.longitude === arr[index - 1].longitude)
    );
    if (filteredPoints.length < 2) {
      setRouteCoordinates([]);
      return;
    }
    try {
      const coordinates = filteredPoints.map(p => `${p.longitude},${p.latitude}`).join(';');
      const url = `http://router.project-osrm.org/route/v1/foot/${coordinates}?overview=full&geometries=geojson`;
      const response = await axios.get(url);
      const data = response.data;
      if (data.code === 'Ok') {
        const route = data.routes[0].geometry.coordinates.map(coord => ({
          latitude: coord[1],
          longitude: coord[0],
          timestamp: Date.now(),
          isManual: false,
        }));
        setRouteCoordinates(route);
      } else {
        console.error('Ошибка OSRM:', data.code);
        setRouteCoordinates(filteredPoints);
      }
    } catch (e) {
      console.error('Ошибка запроса маршрута:', e);
      setRouteCoordinates(filteredPoints);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ latitude, longitude });
          const entry = { latitude, longitude, timestamp: Date.now(), isManual: false };
          setLogTable([entry]);
          fetchRoute([entry]);
        },
        (err) => console.error('Ошибка геолокации:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );

      const watcher = navigator.geolocation.watchPosition(
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          const distance = location ? calculateDistance(location.latitude, location.longitude, latitude, longitude) : 0;
          if (distance >= 10) {
            const entry = { latitude, longitude, timestamp: Date.now(), isManual: false };
            setLogTable(prev => {
              const newTable = [...prev, entry].slice(-100);
              fetchRoute(newTable);
              return newTable;
            });
            setLocation({ latitude, longitude });
          }
        },
        (err) => console.error('Ошибка отслеживания:', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    }
  }, [location]);

  const addManualMarker = () => {
    if (location) {
      const entry = { ...location, timestamp: Date.now(), isManual: true };
      setLogTable(prev => {
        const newTable = [...prev, entry].slice(-100);
        fetchRoute(newTable);
        return newTable;
      });
    }
  };

  const clearLogTable = () => {
    setLogTable([]);
    setRouteCoordinates([]);
  };

  const viewCoordinates = () => {
    navigate('/coordinates', { state: { logTable } });
  };

  return (
    <div className="map-container">
      {location ? (
        <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[location.latitude, location.longitude]}>
            <Popup>Ты здесь</Popup>
          </Marker>
          {logTable.map((p, i) => (
            <Marker key={i} position={[p.latitude, p.longitude]}>
              <Popup>{p.isManual ? `Моя метка ${i + 1}` : `Точка ${i + 1}`}<br />{new Date(p.timestamp).toLocaleTimeString()}</Popup>
            </Marker>
          ))}
          {routeCoordinates.length > 1 && <Polyline positions={routeCoordinates.map(p => [p.latitude, p.longitude])} color="red" />}
        </MapContainer>
      ) : (
        <p>Определяем местоположение...</p>
      )}
      <div className="button-container">
        <button className="button" onClick={addManualMarker}>Поставить метку</button>
        <button className="button button-history" onClick={viewCoordinates}>Посмотреть координаты</button>
        <button className="button button-clear" onClick={clearLogTable}>Очистить координаты</button>
      </div>
    </div>
  );
}

export default MapViewer;