// Real-world coordinates for Protected Forests in India
// Used for "Legit" regulatory verification against deforestation.

export interface ProtectedZone {
    name: string;
    description: string;
    coordinates: [number, number][]; // Lat, Lng
}

export const PROTECTED_ZONES: ProtectedZone[] = [
    {
        name: "Sanjay Gandhi National Park",
        description: "Protected Area (PA) - Critical Habitat",
        coordinates: [
            [19.1350, 72.9000],
            [19.1450, 72.9200],
            [19.2200, 72.9600],
            [19.2800, 72.9400],
            [19.2900, 72.9100],
            [19.2500, 72.8800],
            [19.1800, 72.8750],
            [19.1350, 72.9000] // Close loop
        ]
    },
    {
        name: "Tungareshwar Wildlife Sanctuary",
        description: "Reserved Forest Zone - Buffer Area",
        coordinates: [
            [19.4000, 72.9300],
            [19.4200, 72.9600],
            [19.4100, 72.9800],
            [19.3800, 72.9500],
            [19.4000, 72.9300]
        ]
    }
];

// Helper to check if a point is inside a polygon (Ray-casting algorithm)
export function isPointInPolygon(point: [number, number], vs: [number, number][]) {
    var x = point[0], y = point[1];
    var inside = false;
    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
        var xi = vs[i][0], yi = vs[i][1];
        var xj = vs[j][0], yj = vs[j][1];

        var intersect = ((yi > y) != (yj > y))
            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
};
