"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon path issue with webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface CourseMapProps {
  latitude: number;
  longitude: number;
  courseName: string;
  windDirection?: number;
  windSpeed?: number;
}

function WindArrow({
  lat,
  lng,
  direction,
  speed,
}: {
  lat: number;
  lng: number;
  direction: number;
  speed: number;
}) {
  const map = useMap();
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
    }

    const icon = L.divIcon({
      className: "wind-arrow-icon",
      html: `<div style="transform: rotate(${direction}deg); display: flex; flex-direction: column; align-items: center;">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="white" stroke="black" stroke-width="2"/>
          <path d="M20 6 L25 18 L20 15 L15 18 Z" fill="black"/>
          <text x="20" y="30" text-anchor="middle" font-size="10" font-weight="bold" fill="black">${Math.round(speed)}</text>
        </svg>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const marker = L.marker([lat, lng + 0.008], { icon });
    marker.addTo(map);
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }
    };
  }, [map, lat, lng, direction, speed]);

  return null;
}

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 14);
  }, [map, lat, lng]);
  return null;
}

export default function CourseMap({
  latitude,
  longitude,
  courseName,
  windDirection,
  windSpeed,
}: CourseMapProps) {
  return (
    <div className="rounded-base border-2 border-border shadow-shadow overflow-hidden h-[350px] lg:h-full lg:min-h-[400px]">
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater lat={latitude} lng={longitude} />
        <Marker position={[latitude, longitude]}>
          <Popup>
            <strong>{courseName}</strong>
          </Popup>
        </Marker>
        {windDirection !== undefined && windSpeed !== undefined && (
          <WindArrow
            lat={latitude}
            lng={longitude}
            direction={windDirection}
            speed={windSpeed}
          />
        )}
      </MapContainer>
    </div>
  );
}
