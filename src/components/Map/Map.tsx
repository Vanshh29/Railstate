import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface FeatureProperties {
    YARDNAME: string;
    KM: number;
}

const Map: React.FC = () => {
    const [railwayData, setRailwayData] = useState<any>(null);
    const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
    const [selectedLines, setSelectedLines] = useState<L.Layer[]>([]);


    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/MA_rail_lines.geojson`)
            .then((response) => response.json())
            .then((data) => {

                const filteredData = {
                    ...data,
                    features: data.features.filter((feature: any) => feature.properties.YARDNAME),
                };
                setRailwayData(filteredData);
            })
            .catch((error) => console.error('Error fetching GeoJSON:', error));
    }, []);


    const onEachFeature: L.GeoJSONOptions['onEachFeature'] = (feature, layer) => {
        layer.on({
            mouseover: () => {
                setSelectedFeature(feature.properties);
            },
            mouseout: () => {
                setSelectedFeature(null);
            },
            click: () => {

                setSelectedLines((prevLines) => {

                    if (!prevLines.includes(layer)) {
                        return [...prevLines, layer];
                    }
                    return prevLines;
                });
            },
        });
    };


    const totalDistance = selectedLines.reduce((sum, layer) => {
        const feature = (layer as any).feature;
        return sum + feature.properties.KM;
    }, 0);


    const clearSelectedLines = () => {
        setSelectedLines([]);
    };

    return (
        <div className="relative">

            <MapContainer center={[42.35, -71.8]} zoom={10} className="w-full h-96">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {railwayData && <GeoJSON data={railwayData} onEachFeature={onEachFeature} />}
            </MapContainer>


            {selectedLines.length > 0 && (
                <div className="absolute bottom-0 left-0 bg-white p-2 shadow-lg w-full">
                    <h2 className="text-lg font-semibold">Selected Segment</h2>
                    <p>Total Distance: {totalDistance.toFixed(2)} KM</p>
                    <ul>
                        {selectedLines.map((layer, index) => {
                            const feature = (layer as any).feature;
                            return (
                                <li key={index}>
                                    Yard Name: {feature.properties.YARDNAME}, KM: {feature.properties.KM}
                                </li>
                            );
                        })}
                    </ul>
                    <button
                        onClick={clearSelectedLines}
                        className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Clear Selection
                    </button>
                </div>
            )}


            <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded">
                {selectedFeature ? (
                    <>
                        <h2 className="text-lg font-semibold">Hovered Line Info</h2>
                        <p>Yard Name: {selectedFeature.YARDNAME}</p>
                        <p>KM: {selectedFeature.KM}</p>
                    </>
                ) : (
                    <p>Hover over a line to see details.</p>
                )}
            </div>
        </div>
    );
};

export default Map;
