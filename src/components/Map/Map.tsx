import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Feature, FeatureCollection, Geometry } from 'geojson';

interface FeatureProperties {
    YARDNAME: string;
    KM: number;
    OBJECTID: number;
}

type FeatureLayer = L.Layer & {
    feature: Feature<Geometry, FeatureProperties>;
    _eventHandlersAttached?: boolean;
};

const Map: React.FC = () => {
    const [railwayData, setRailwayData] = useState<FeatureCollection<Geometry, FeatureProperties> | null>(null);
    const [selectedFeature, setSelectedFeature] = useState<FeatureProperties | null>(null);
    const [selectedLines, setSelectedLines] = useState<FeatureLayer[]>([]);
    const [highlightedLines, setHighlightedLines] = useState<FeatureLayer[]>([]);
    const [isPathConnected, setIsPathConnected] = useState<boolean>(true);

    const geoJsonRef = useRef<L.GeoJSON>(null);

    useEffect(() => {
        fetch(`${process.env.PUBLIC_URL}/MA_rail_lines.geojson`)
            .then((response) => response.json())
            .then((data: FeatureCollection<Geometry, FeatureProperties>) => {
                const filteredData: FeatureCollection<Geometry, FeatureProperties> = {
                    ...data,
                    features: data.features.filter((feature) => feature.properties.YARDNAME),
                };
                setRailwayData(filteredData);
            })
            .catch((error) => console.error('Error fetching GeoJSON:', error));
    }, []);

    const getLineCoordinates = (layer: FeatureLayer): number[][] => {
        const geometry = layer.feature.geometry;
        if (geometry.type === 'LineString') {
            return geometry.coordinates as number[][];
        } else if (geometry.type === 'MultiLineString') {
            return geometry.coordinates.flat() as number[][];
        }
        return [];
    };

    const areLinesConnected = (lastLine: FeatureLayer, newLine: FeatureLayer): boolean => {
        const lastLineCoords = getLineCoordinates(lastLine);
        const newLineCoords = getLineCoordinates(newLine);

        if (lastLineCoords.length === 0 || newLineCoords.length === 0) {
            return false;
        }

        const lastCoordEnd = lastLineCoords[lastLineCoords.length - 1];
        const newCoordStart = newLineCoords[0];

        return (
            lastCoordEnd[0] === newCoordStart[0] &&
            lastCoordEnd[1] === newCoordStart[1]
        );
    };

    const checkIfPathConnected = (lines: FeatureLayer[]): boolean => {
        for (let i = 0; i < lines.length - 1; i++) {
            if (!areLinesConnected(lines[i], lines[i + 1])) {
                return false;
            }
        }
        return true;
    };

    const findValidNextLines = (selectedLine: FeatureLayer, allLines: FeatureLayer[]): FeatureLayer[] => {
        return allLines.filter(
            (line) => areLinesConnected(selectedLine, line) && !selectedLines.includes(line)
        );
    };

    const onEachFeature: L.GeoJSONOptions['onEachFeature'] = (feature, layer) => {
        const featureLayer = layer as FeatureLayer;
        featureLayer.feature = feature as Feature<Geometry, FeatureProperties>;

        if (!featureLayer._eventHandlersAttached) {
            featureLayer.on({
                mouseover: () => {
                    setSelectedFeature(feature.properties);
                },
                mouseout: () => {
                    setSelectedFeature(null);
                },
                click: () => {
                    const allLayers = geoJsonRef.current?.getLayers() as FeatureLayer[] || [];

                    setSelectedLines((prevLines) => {
                        if (prevLines.length === 0) {
                            setIsPathConnected(true);
                            const validNext = findValidNextLines(featureLayer, allLayers);
                            setHighlightedLines(validNext);
                            return [featureLayer];
                        }

                        const lastLine = prevLines[prevLines.length - 1];

                        if (areLinesConnected(lastLine, featureLayer)) {
                            if (prevLines.length < 20 && !prevLines.includes(featureLayer)) {
                                const newLines = [...prevLines, featureLayer];
                                const pathConnected = checkIfPathConnected(newLines);
                                setIsPathConnected(pathConnected);

                                const validNext = findValidNextLines(featureLayer, allLayers);
                                setHighlightedLines(validNext);

                                return newLines;
                            }
                        } else {
                            alert('This line is not connected to the previous line. It cannot be added to the segment.');
                        }

                        return prevLines;
                    });
                },
            });

            featureLayer._eventHandlersAttached = true;
        }
    };

    const styleGeoJson = (feature?: Feature<Geometry, FeatureProperties>) => {
        if (!feature || !feature.properties) {
            return {
                color: 'blue',
                weight: 3,
            };
        }

        const isHighlighted = highlightedLines.some((highlightedLine) => {
            return highlightedLine.feature.properties.OBJECTID === feature.properties.OBJECTID;
        });

        return {
            color: isHighlighted ? 'green' : 'blue',
            weight: isHighlighted ? 5 : 3,
        };
    };

    const totalDistance = selectedLines.reduce((sum, layer) => {
        return sum + (layer.feature.properties.KM || 0);
    }, 0);

    const clearSelectedLines = () => {
        setSelectedLines([]);
        setHighlightedLines([]);
        setIsPathConnected(true);
    };

    return (
        <div className="relative flex flex-col items-center">
            <MapContainer center={[42.35, -71.8]} zoom={10} className="w-full h-96 mb-4">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {railwayData && (
                    <GeoJSON
                        data={railwayData}
                        onEachFeature={onEachFeature}
                        style={styleGeoJson}
                        ref={geoJsonRef}
                    />
                )}
            </MapContainer>

            <div className="p-4 bg-gray-100 border border-gray-300 rounded mb-4 w-full max-w-xl">
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
                <div className="p-4 bg-white border border-gray-300 rounded w-full max-w-xl">
                    <h2 className="text-lg font-semibold">Selected Segment</h2>
                    <p>Total Distance: {totalDistance.toFixed(2)} KM</p>
                    <ul>
                        {selectedLines.map((layer, index) => (
                            <li key={index}>
                                Yard Name: {layer.feature.properties.YARDNAME}, KM: {layer.feature.properties.KM}
                                <button
                                    onClick={() => clearSelectedLines()}
                                    className="ml-4 bg-red-500 text-white px-2 py-1 rounded"
                                >
                                    Remove
                                </button>
                            </li>
                        ))}
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
