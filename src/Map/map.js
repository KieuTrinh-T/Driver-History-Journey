import Map from 'react-map-gl';
import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf'
function MapGL() {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lng, setLng] = useState(106.6444361);
    const [lat, setLat] = useState(10.7977039);
    const [zoom, setZoom] = useState(12);
    const [supplierId, setSupplierId] = useState('84345860205');
    const [supplierToken, setSupplierToken] = useState('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJhaGEiLCJ0eXAiOiJzdXBwbGllciIsImNpZCI6Ijg0MzQ1ODYwMjA1Iiwic3RhdHVzIjoiT0ZGTElORSIsImVvYyI6Im5odW5nbnQzNjJAZ21haWwuY29tIiwibm9jIjoiU3VzaSIsImN0eSI6IlNHTiIsImFjY291bnRfc3RhdHVzIjoiQUNUSVZBVEVEIiwicm9sZSI6ImFkbWluIiwicm9sZV9pZHMiOltdLCJleHAiOjE2ODQyMTM4OTEsInR5cGUiOiJ3ZWIiLCJpbWVpIjoid2ViIn0.r7qlu1xEG4gdQ6flJSi88UkQBClTx31g_1W-RiHuis4');
    const [date, setDate] = useState('2024-01-03');
    let start;

    const animationDuration = 30000;


    async function displayMap() {

        if (map.current) return; // initialize map only once
        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [lng, lat],
            zoom: zoom
        });
        var options = {
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            headers: {
                'Authorization': 'Bearer ' + supplierToken,
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://apistg.ahamove.com',
            }
        };
        var dateUnix = new Date(date);
        dateUnix.setHours(0, 0, 0, 0);
        var fromTime = Math.floor(dateUnix.getTime() / 1000);
        dateUnix.setHours(23, 59, 59, 999);
        var toTime = Math.floor(dateUnix.getTime() / 1000) + 86400;
        var url = 'https://apistg.ahamove.com/api/v3/private/supplier/location/' + supplierId + '/history?from-time=' + fromTime + '&to-time=' + toTime;

        const [pinRouteGeojson] = await Promise.all([
            fetch(
                url, options
            ).then((response) => response.json()),
            map.current.once('style.load')
        ]);

        var pinRoute = [];
        pinRouteGeojson.forEach(element => {
            pinRoute.push(element.coordinates);
        });

        map.current.on('move', () => {
            setLng(map.current.getCenter().lng.toFixed(4));
            setLat(map.current.getCenter().lat.toFixed(4));
            setZoom(map.current.getZoom().toFixed(2));
        });
        const el = document.createElement('div');

        el.className = 'marker';
        el.style.backgroundImage = `url(https://web-app.hn.ss.bfcplatform.vn/ahamoveimg/aha-vehicle/Bike.png)`;
        el.style.width = `50px`;
        el.style.height = `50px`;
        el.style.backgroundSize = '100%';
        const marker = new mapboxgl.Marker({
            element: el,
            scale: 0.8,
            draggable: false,
            pitchAlignment: 'auto',
            rotationAlignment: 'auto'
        })
        // Add terrain source, with slight exaggeration

        map.current.addSource('line', {
            type: 'geojson',
            lineMetrics: true,
            data: {
                'type': 'Feature',
                'geometry': {
                    'type': 'LineString',
                    'coordinates': pinRoute
                }
            }
        });
        map.current.addLayer({
            type: 'line',
            source: 'line',
            id: 'line',
            paint: {
                'line-color': 'rgba(0,0,0,0)',
                'line-width': 3
            },
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            }
        });
        await map.current.once('idle');

        const path = turf.lineString(pinRoute);
        const pathDistance = turf.lineDistance(path);
        function animateMarker(time) {
            if (!start) start = time;
            const animationPhase = (time - start) / animationDuration;
            if (animationPhase > 1) {
                return;
            }
            const alongPath = turf.along(path, pathDistance * animationPhase).geometry.coordinates;
            const lngLat = {
                lng: alongPath[0],
                lat: alongPath[1]
            };
            marker.setLngLat(lngLat);

            marker.addTo(map.current);
            map.current.flyTo({
                center: lngLat,
                speed: 0.2
            });
            map.current.setPaintProperty('line', 'line-gradient', [
                'step',
                ['line-progress'],
                'red',
                animationPhase,
                'rgba(255, 0, 0, 0)'
            ]);
            requestAnimationFrame(animateMarker);

        }
        requestAnimationFrame(animateMarker);
    }


    // useEffect(() => {
    //     fetchPinRouteGeojson()

    // }, [supplierId]);

    return (
        <>
            <div className='supplier-info' >
                <input type="text"
                    placeholder="Supplier ID"
                    onChange={e => setSupplierId(e.target.value)}
                    value={supplierId} />
                <input type="text"
                    placeholder="Supplier Token"
                    onChange={e => setSupplierToken(e.target.value)}
                    value={supplierToken} />
                <input type='date'
                    placeholder='Date'
                    onChange={e => setDate(e.target.value)}
                    value={date} />
                <button onClick={displayMap} > Run </button>

            </div>
            <div className="sidebar">Longitude: {lng} | Latitude: {lat} | Zoom: {zoom} </div>
            <div ref={mapContainer} className="map-container" > </div>
        </>
    );
}
export default MapGL;