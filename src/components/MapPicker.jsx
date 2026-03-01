import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon (leaflet CSS path issue with bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom green pin icon
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Inner component: captures map click events
function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Ensures tiles render properly after lazy-load / toggle visibility
function InvalidateSizeOnMount() {
  const map = useMap();
  useEffect(() => {
    // Small delay to let the container finish layout
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Draggable marker component
function DraggableMarker({ position, onDragEnd }) {
  const markerRef = useRef(null);
  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          onDragEnd(marker.getLatLng());
        }
      },
    }),
    [onDragEnd]
  );

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={greenIcon}
    />
  );
}

/**
 * MapPicker — Uber/Ola-style location picker.
 *
 * Props:
 *   - onLocationSelect(lat, lng) — called when user picks a spot
 *   - initialLat, initialLng — optional starting coordinates
 *   - className — optional wrapper class (ignored for height — uses explicit px)
 */
export default function MapPicker({
  onLocationSelect,
  initialLat = 20.5937,
  initialLng = 78.9629,
  className = "",
}) {
  const [pin, setPin] = useState(null);
  const [mapReady, setMapReady] = useState(false);

  // Centre on India by default (zoom 5)
  const center = [initialLat, initialLng];

  const handlePinChange = useCallback(
    (latlng) => {
      const { lat, lng } = latlng;
      setPin([lat, lng]);
      onLocationSelect?.(lat, lng);
    },
    [onLocationSelect]
  );

  // If initial coords provided (from GPS), set pin
  useEffect(() => {
    if (initialLat !== 20.5937 || initialLng !== 78.9629) {
      setPin([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ring-1 ring-gray-200`}
      style={{ height: 320, width: "100%" }}
    >
      {/* Instruction overlay */}
      {!pin && mapReady && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center">
          <div className="rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-slate-700 shadow-lg backdrop-blur-sm">
            📍 Tap on the map or drag the pin to select your farm location
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={initialLat !== 20.5937 ? 13 : 5}
        scrollWheelZoom={true}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        whenReady={() => setMapReady(true)}
      >
        <InvalidateSizeOnMount />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onMapClick={handlePinChange} />
        {pin && (
          <DraggableMarker
            position={pin}
            onDragEnd={handlePinChange}
          />
        )}
      </MapContainer>

      {/* Coordinates badge */}
      {pin && (
        <div className="absolute bottom-3 left-3 z-[1000] rounded-xl bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-md backdrop-blur-sm">
          📍 {pin[0].toFixed(4)}, {pin[1].toFixed(4)}
        </div>
      )}
    </div>
  );
}
