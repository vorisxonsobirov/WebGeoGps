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
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Иконка для текущей позиции и автоматических меток (синяя)
  const defaultIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });

  // Иконка для ручных меток (зелёная)
  const manualIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [0, -41],
  });

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
    const savedLogTable = localStorage.getItem('logTable');
    if (savedLogTable) setLogTable(JSON.parse(savedLogTable));

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          console.log('Успешно определено местоположение:', { latitude, longitude });
          setLocation({ latitude, longitude });
          const entry = { latitude, longitude, timestamp: Date.now(), isManual: false };
          setLogTable([entry]);
          fetchRoute([entry]);
          setError(null);
        },
        (err) => {
          console.error('Ошибка геолокации:', err);
          setError(`Ошибка геолокации: ${err.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );

      const watcher = navigator.geolocation.watchPosition(
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          console.log('Обновлено местоположение:', { latitude, longitude });
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
        (err) => {
          console.error('Ошибка отслеживания:', err);
          setError(`Ошибка отслеживания: ${err.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
      return () => navigator.geolocation.clearWatch(watcher);
    } else {
      setError('Геолокация не поддерживается вашим браузером');
    }
  }, [location]);

  useEffect(() => {
    localStorage.setItem('logTable', JSON.stringify(logTable));
  }, [logTable]);

  const addManualMarker = (e) => {
    e.preventDefault();
    if (location) {
      const entry = { ...location, timestamp: Date.now(), isManual: true };
      setLogTable(prev => {
        const newTable = [...prev, entry].slice(-100);
        fetchRoute(newTable);
        return newTable;
      });
    }
  };

  const clearLogTable = (e) => {
    e.preventDefault();
    setLogTable([]);
    setRouteCoordinates([]);
  };

  const viewCoordinates = (e) => {
    e.preventDefault();
    navigate('/coordinates', { state: { logTable } });
  };

  return (
    <div className="map-container">
      {error && <p style={{ color: 'red', position: 'absolute', top: 10, zIndex: 1000 }}>{error}</p>}
      {location ? (
        <MapContainer center={[location.latitude, location.longitude]} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={[location.latitude, location.longitude]} icon={defaultIcon}>
            <Popup>Ты здесь</Popup>
          </Marker>
          {logTable.map((p, i) => (
            <Marker key={i} position={[p.latitude, p.longitude]} icon={p.isManual ? manualIcon : defaultIcon}>
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