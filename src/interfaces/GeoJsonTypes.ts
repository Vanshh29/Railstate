export interface RailwayLine {
    OBJECTID_1: number;
    YARDNAME: string;
    KM: number;
    // Add other fields as necessary
}

export interface GeoJsonFeature {
    type: string;
    properties: RailwayLine;
    geometry: {
        type: string;
        coordinates: number[][];
    };
}
