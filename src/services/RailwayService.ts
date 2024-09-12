export const fetchRailwayData = async (): Promise<any> => {
    const response = await fetch('path-to-your-geojson-file'); // Replace with actual path
    if (!response.ok) throw new Error('Failed to fetch railway data');
    return await response.json();
};
