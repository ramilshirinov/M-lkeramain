"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { FiCheckCircle, FiMapPin, FiRotateCcw } from "react-icons/fi";

const BAKU_CENTER = [40.4093, 49.8671];

function normalize(v) {
  if (!v) return null;
  const lat = Number(v.lat ?? v.latitude);
  const lng = Number(v.lng ?? v.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function pinHtml(confirmed) {
  const color = confirmed ? "#16a34a" : "#f59e0b";
  return `<div style="width:26px;height:26px;border-radius:50% 50% 50% 0;background:${color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4);transform:rotate(-45deg);"></div>`;
}

/**
 * value    → təsdiqlənmiş koordinat ({ lat, lng } və ya null)
 * onChange → YALNIZ "təsdiq et" düyməsi basılanda çağırılır ({ lat, lng }), sıfırlananda null
 */
export default function LocationPicker({
  value = null,
  latitude = null,
  longitude = null,
  onChange,
  height = 380,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const leafletRef = useRef(null);

  const initial = normalize(
    value || (latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null)
  );

  const [mapReady, setMapReady] = useState(false);
  const [pending, setPending] = useState(() => initial);
  const [confirmedState, setConfirmedState] = useState(() => initial);

  const isConfirmed =
    !!confirmedState &&
    !!pending &&
    Math.abs(confirmedState.lat - pending.lat) < 0.00001 &&
    Math.abs(confirmedState.lng - pending.lng) < 0.00001;
  const isDirty = !!pending && !isConfirmed;

  // Xarici dəyər dəyişəndə sinxronlaşdırırıq
  useEffect(() => {
    const next = normalize(
      value || (latitude != null && longitude != null ? { lat: latitude, lng: longitude } : null)
    );
    if (next) {
      setPending(next);
      setConfirmedState(next);
      if (mapRef.current) mapRef.current.setView([next.lat, next.lng], 15);
    }
  }, [value, latitude, longitude]);

  // Xəritəni bir dəfə qururuq
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const L = mod.default || mod;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start = initial;
      const map = L.map(containerRef.current).setView(
        start ? [start.lat, start.lng] : BAKU_CENTER,
        start ? 15 : 11
      );
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      // Klik → gözləyən seçim
      map.on("click", (e) => {
        setPending({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      leafletRef.current = L;
      mapRef.current = map;
      setMapReady(true);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
        setMapReady(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marker: gözləyən (sarı) / təsdiqlənmiş (yaşıl)
  useEffect(() => {
    if (!mapReady) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!pending) {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      return;
    }

    const icon = L.divIcon({
      className: "mulkera-marker",
      html: pinHtml(isConfirmed),
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    });

    if (!markerRef.current) {
      const marker = L.marker([pending.lat, pending.lng], { icon, draggable: true });
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        setPending({ lat: p.lat, lng: p.lng });
      });
      marker.addTo(map);
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([pending.lat, pending.lng]);
      markerRef.current.setIcon(icon);
    }
  }, [mapReady, pending, isConfirmed]);

  const handleConfirm = () => {
    if (!pending) return;
    setConfirmedState(pending);
    if (onChange) {
      // Həm (lat, lng), həm də ({ lat, lng }) formatında ötürülür
      if (onChange.length >= 2) {
        onChange(pending.lat, pending.lng);
      } else {
        onChange(pending);
      }
    }
  };

  const handleReset = () => {
    setPending(null);
    setConfirmedState(null);
    if (onChange) {
      if (onChange.length >= 2) {
        onChange(null, null);
      } else {
        onChange(null);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Vəziyyət və Koordinat Paneli */}
      {!pending && (
        <div className="flex items-center gap-2 rounded-xl border border-navy/10 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm font-medium text-navy/70 dark:text-slate-300">
          <FiMapPin className="text-copper shrink-0" />
          <span>Əmlakın yerini seçmək üçün xəritədə istənilən nöqtəyə klikləyin və ya markeri sürükləyin.</span>
        </div>
      )}
      {isDirty && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 px-4 py-3 text-sm font-semibold text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <FiMapPin className="shrink-0 text-amber-600" />
            <span>Yer seçildi (Gözləyir):</span>
            <span className="font-mono bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded text-xs">
              {pending.lat.toFixed(5)}, {pending.lng.toFixed(5)}
            </span>
          </div>
          <span className="text-xs text-amber-700 dark:text-amber-400 font-normal">
            Təsdiq etmək üçün aşağıdakı düyməyə basın ➔
          </span>
        </div>
      )}
      {isConfirmed && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-800 px-4 py-3 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="shrink-0 text-emerald-600" />
            <span>Məkan Təsdiqləndi:</span>
            <span className="font-mono bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded text-xs">
              {confirmedState.lat.toFixed(5)}, {confirmedState.lng.toFixed(5)}
            </span>
          </div>
          <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
            ✓ Koordinatlar yadda saxlandı
          </span>
        </div>
      )}

      {/* Xəritə */}
      <div
        className="relative isolate w-full overflow-hidden rounded-xl border border-navy/10 dark:border-slate-700 shadow-sm"
        style={{ height }}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      {/* Düymələr və Vizual Koordinat İnformasiyası */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!pending || isConfirmed}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold transition shadow-sm cursor-pointer ${
            isConfirmed
              ? "bg-emerald-600 text-white cursor-default"
              : pending
              ? "bg-copper hover:bg-copper/90 text-white animate-pulse"
              : "bg-navy text-white hover:bg-copper disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          <FiCheckCircle className="text-base" />
          {isConfirmed ? "Məkan Təsdiqləndi ✓" : "Məkanı Təsdiqlə (Confirm Location)"}
        </button>

        {pending && (
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-navy/10 dark:border-slate-700 text-xs font-mono text-navy/80 dark:text-slate-300">
            <span>Enlik: <strong>{pending.lat.toFixed(5)}</strong></span>
            <span>·</span>
            <span>Uzunluq: <strong>{pending.lng.toFixed(5)}</strong></span>
          </div>
        )}

        <button
          type="button"
          onClick={handleReset}
          disabled={!pending && !confirmedState}
          className="flex items-center justify-center gap-2 rounded-xl border border-navy/15 dark:border-slate-600 bg-white dark:bg-slate-900 px-5 py-3 text-sm font-semibold text-navy dark:text-slate-100 transition hover:border-copper hover:text-copper disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          <FiRotateCcw /> Sıfırla
        </button>
      </div>
    </div>
  );
}