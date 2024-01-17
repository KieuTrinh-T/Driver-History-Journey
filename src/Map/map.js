import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf'
function MapGL() {
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN;
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [lng, setLng] = useState(106.6444361);
    const [lat, setLat] = useState(10.7977039);
    const [zoom, setZoom] = useState(12);
    const [supplierId, setSupplierId] = useState(process.env.REACT_APP_SUPPLIER_ID);
    // const [supplierToken, setSupplierToken] = useState(process.env.REACT_APP_SUPPLIER_TOKEN);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - 7);
    const [run, setRun] = useState(0);
    const [spinner, setSpinner] = useState(false);
    let start;
    const mapID = 'line'


    const animationDuration = 30000;
    useEffect(() => {
        async function displayMap() {
            if (map.current) return;
            map.current = new mapboxgl.Map({
                container: mapContainer.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [lng, lat],
                zoom: zoom
            });

        }
        function calculateBearing(point1, point2) {
            const lat1 = point1[1] * Math.PI / 180;
            const lng1 = point1[0] * Math.PI / 180;
            const lat2 = point2[1] * Math.PI / 180;
            const lng2 = point2[0] * Math.PI / 180;
            const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) -
                Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

            let brng = Math.atan2(y, x) * 180 / Math.PI;

            return brng;
        }

        async function fetchPinRouteGeojson() {
            var options = {
                method: 'GET',
                mode: 'cors',
                credentials: 'include',
                headers: {
                    'Authorization': 'Bearer ' + process.env.REACT_APP_SUPPLIER_TOKEN,
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://apistg.ahamove.com',
                }
            };
            var dateUnix = new Date(date);
            console.log(date);
            dateUnix.setHours(0, 0, 0, 0);
            var fromTime = Math.floor(dateUnix.getTime() / 1000);
            dateUnix.setHours(23, 59, 59, 999);
            var toTime = Math.floor(dateUnix.getTime() / 1000) + 86400;
            var url = 'https://apistg.ahamove.com/api/v3/private/supplier/location/' + supplierId + '/history?from-time=' + fromTime + '&to-time=' + toTime;
            const [pinRouteGeojson] = await Promise.all([
                fetch(
                    url, options
                ).then((response) => {
                    if (response.status === 200) {
                        return response.json();
                    }
                    else {
                        alert('Error at fetching data: ' + response.status);
                        return;
                    }
                }),
                // map.current.once('style.load'),
            ]);
            // displayMap();
            setSpinner(false)

            if (!pinRouteGeojson) {
                return;
            }
            var pinRoute = [];
            pinRouteGeojson.forEach(element => {
                pinRoute.push(element.coordinates);
            });
            if (pinRoute.length === 0) {
                alert('No data found');
                return;
            }
            //remove old marker
            if (map.current.getLayer(mapID + (run - 1))) {
                map.current.removeLayer(mapID + (run - 1));
                map.current.removeSource(mapID + (run - 1));
                document.getElementById('marker_' + (run - 1)).remove();
            }
            const el = document.createElement('div');

            el.className = 'marker';
            el.id = 'marker_' + run;
            el.style.backgroundImage = `url(https://web-app.hn.ss.bfcplatform.vn/ahamoveimg/aha-vehicle/Bike.png)`;
            el.style.width = `50px`;
            el.style.height = `50px`;
            el.style.backgroundSize = '100%';

            const marker = new mapboxgl.Marker({
                element: el,
                scale: 0.8,
                draggable: false,
                pitchAlignment: 'auto',
                rotationAlignment: 'map'
            })
            let previousPoint = pinRoute[0];

            map.current.addSource(mapID + run, {
                type: 'geojson',
                lineMetrics: true,
                data: {
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': pinRoute
                    }
                },
            });
            map.current.addLayer({
                type: 'line',
                source: mapID + run,
                id: mapID + run,
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
                // Calculate bearing (angle) between previous point and current point
                const bearing = calculateBearing(previousPoint, alongPath);
                marker.setRotation(bearing);
                marker.addTo(map.current);
                map.current.flyTo({
                    center: lngLat,
                    speed: 0.5
                });
                map.current.setPaintProperty(mapID + run, 'line-gradient', [
                    'step',
                    ['line-progress'],
                    'red',
                    animationPhase,
                    'rgba(255, 0, 0, 0)'
                ]);
                previousPoint = alongPath; // Update previous point
                requestAnimationFrame(animateMarker);

            }
            requestAnimationFrame(animateMarker);
        }
        displayMap();
        if (run > 0) {
            if (!verifyInput()) {
                alert('Please fill in all fields');
                return;
            }
            fetchPinRouteGeojson();
        }
    }, [run])

    function verifyInput() {
        if (supplierId === '' || date === '')
            return false;
        return true;
    }


    return (
        <>
            {spinner && (
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            )}
            <div className='supplier-info' >
                <input type="text"
                    placeholder="Supplier ID"
                    onChange={e => setSupplierId(e.target.value)}
                    value={supplierId} />
                <input type='date'
                    placeholder='Date'
                    onChange={e => setDate(e.target.value)}
                    value={date}
                    min={minDate.toISOString().slice(0, 10)}
                    max={new Date().toISOString().slice(0, 10)}
                />
                <button onClick={() => {
                    setRun(run + 1);
                    setSpinner(true);

                }}>Run</button>

            </div>
            <div className="map-canvas">Longitude: {lng} | Latitude: {lat} | Zoom: {zoom} </div>
            <div ref={mapContainer} className="map-container" > </div>
        </>
    );
}
export default MapGL;