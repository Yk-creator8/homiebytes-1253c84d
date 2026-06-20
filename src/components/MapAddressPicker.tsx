import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, LocateFixed } from "lucide-react";

declare global {
  interface Window { google: any; __cb_gmaps_loaded?: boolean; __cb_gmaps_init?: () => void; }
}

const BROWSER_KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const TRACKING_ID = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.__cb_gmaps_loaded) return Promise.resolve();
  if (!BROWSER_KEY) return Promise.reject(new Error("Maps key missing"));
  return new Promise((resolve, reject) => {
    window.__cb_gmaps_init = () => { window.__cb_gmaps_loaded = true; resolve(); };
    const existing = document.querySelector('script[data-cb-gmaps]');
    if (existing) return;
    const s = document.createElement("script");
    s.dataset.cbGmaps = "1";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_KEY}&libraries=places&loading=async&callback=__cb_gmaps_init${TRACKING_ID ? `&channel=${TRACKING_ID}` : ""}`;
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

export type MapAddress = { address: string; lat: number; lng: number };

export function MapAddressPicker({ value, onChange }: { value: MapAddress | null; onChange: (v: MapAddress) => void }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const mapObj = useRef<any>(null);
  const markerObj = useRef<any>(null);

  useEffect(() => {
    loadMaps().then(() => {
      const g = window.google;
      const start = value ?? { lat: 12.9716, lng: 77.5946, address: "" };
      const map = new g.maps.Map(mapRef.current!, {
        center: { lat: start.lat, lng: start.lng },
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
      });
      const marker = new g.maps.Marker({ map, position: { lat: start.lat, lng: start.lng }, draggable: true });
      mapObj.current = map;
      markerObj.current = marker;

      const geocoder = new g.maps.Geocoder();
      const setFromLatLng = (lat: number, lng: number) => {
        geocoder.geocode({ location: { lat, lng } }, (res: any[]) => {
          const addr = res?.[0]?.formatted_address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          onChange({ address: addr, lat, lng });
          if (inputRef.current) inputRef.current.value = addr;
        });
      };

      marker.addListener("dragend", () => {
        const p = marker.getPosition();
        setFromLatLng(p.lat(), p.lng());
      });
      map.addListener("click", (e: any) => {
        marker.setPosition(e.latLng);
        setFromLatLng(e.latLng.lat(), e.latLng.lng());
      });

      if (inputRef.current) {
        const ac = new g.maps.places.Autocomplete(inputRef.current, { fields: ["formatted_address", "geometry"] });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const loc = place.geometry?.location;
          if (!loc) return;
          const lat = loc.lat(); const lng = loc.lng();
          map.panTo({ lat, lng });
          map.setZoom(16);
          marker.setPosition({ lat, lng });
          onChange({ address: place.formatted_address ?? "", lat, lng });
        });
      }
      setLoading(false);
    }).catch((e) => { setErr(e.message); setLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      mapObj.current?.panTo({ lat, lng });
      mapObj.current?.setZoom(16);
      markerObj.current?.setPosition({ lat, lng });
      const g = window.google;
      new g.maps.Geocoder().geocode({ location: { lat, lng } }, (res: any[]) => {
        const addr = res?.[0]?.formatted_address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        onChange({ address: addr, lat, lng });
        if (inputRef.current) inputRef.current.value = addr;
      });
    });
  };

  if (err) {
    return <div className="rounded-xl ring-1 ring-border bg-secondary/40 p-4 text-sm text-muted-foreground">Map unavailable — please type your address manually.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <input
          ref={inputRef}
          defaultValue={value?.address ?? ""}
          placeholder="Search for your address…"
          className="w-full h-11 rounded-xl bg-background ring-1 ring-border pl-9 pr-24 text-sm"
        />
        <button type="button" onClick={useMyLocation} className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-secondary text-xs font-semibold hover:bg-secondary/70">
          <LocateFixed className="h-3.5 w-3.5" /> Locate
        </button>
      </div>
      <div className="relative rounded-2xl overflow-hidden ring-1 ring-border h-64">
        {loading && <div className="absolute inset-0 grid place-items-center bg-secondary/40"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>}
        <div ref={mapRef} className="h-full w-full" />
      </div>
    </div>
  );
}
