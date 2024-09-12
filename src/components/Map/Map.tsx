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
    const [isPathConnected, setIsPathConnected] = useState<boolean>(true);


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

    const areLinesConnected = (lastLine: L.Layer, newLine: L.Layer): boolean => {
        const lastLineCoords = (lastLine as any).feature.geometry.coordinates;
        const newLineCoords = (newLine as any).feature.geometry.coordinates;

        const lastCoordEnd = lastLineCoords[lastLineCoords.length - 1];
        const newCoordStart = newLineCoords[0];

        return (
            lastCoordEnd[0] === newCoordStart[0] &&
            lastCoordEnd[1] === newCoordStart[1]
        );
    };


    const checkIfPathConnected = (lines: L.Layer[]): boolean => {
        for (let i = 1; i < lines.length; i++) {
            if (!areLinesConnected(lines[i - 1], lines[i])) {
                return false;
            }
        }
        return true;
    };


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

                    if (prevLines.length === 0) {
                        setIsPathConnected(true);
                        return [layer];
                    }


                    const lastLine = prevLines[prevLines.length - 1];

                    if (prevLines.length < 20 && !prevLines.includes(layer)) {
                        const newLines = [...prevLines, layer];
                        const pathConnected = checkIfPathConnected(newLines);
                        setIsPathConnected(pathConnected);
                        return newLines;
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
        setIsPathConnected(true);
    };


    const removeLine = (index: number) => {
        setSelectedLines((prevLines) => {
            const updatedLines = [...prevLines];
            updatedLines.splice(index, 1);


            const pathConnected = checkIfPathConnected(updatedLines);
            setIsPathConnected(pathConnected);

            return updatedLines;
        });
    };

    return (
        <div className="relative">


            <MapContainer center={[42.35, -71.8]} zoom={10} className="w-full h-96 mb-4">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {railwayData && <GeoJSON data={railwayData} onEachFeature={onEachFeature} />}
            </MapContainer>

            <div className="p-4 bg-gray-100 border border-gray-300 rounded mb-4">
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

            {selectedLines.length > 0 && (
                <div className="p-4 bg-white border border-gray-300 rounded">
                    <h2 className="text-lg font-semibold">Selected Segment</h2>
                    <p>Total Distance: {totalDistance.toFixed(2)} KM</p>
                    <ul>
                        {selectedLines.map((layer, index) => {
                            const feature = (layer as any).feature;
                            return (
                                <li key={index}>
                                    Yard Name: {feature.properties.YARDNAME}, KM: {feature.properties.KM}
                                    <button
                                        onClick={() => removeLine(index)}
                                        className="ml-4 bg-red-500 text-white px-2 py-1 rounded"
                                    >
                                        Remove
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <button
                        onClick={clearSelectedLines}
                        className="mt-2 bg-red-500 text-white px-4 py-2 rounded"
                    >
                        Clear Segment
                    </button>


                    <div className="mt-4">
                        {isPathConnected ? (
                            <p className="text-green-600 font-semibold">The selected lines form a connected path.</p>
                        ) : (
                            <p className="text-red-600 font-semibold">The selected lines do not form a connected path.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Map;
