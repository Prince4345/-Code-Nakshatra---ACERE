import { useState, useEffect } from 'react';

export interface IoTData {
    carbonIntensity: number; // tCO2e/ton
    energyConsumption: number; // kWh
    furnaceTemp: number; // Celsius
    timestamp: string;
}

// Default values for standard steel production
const BASE_INTENSITY = 1.8; // Industry average
const BASE_ENERGY = 450;
const BASE_TEMP = 1500;

/**
 * Hook to simulate real-time IoT data streams from factory sensors.
 * Optimized for performance: updates only every 2 seconds to avoid excessive re-renders.
 */
export const useIoTSimulation = () => {
    const [data, setData] = useState<IoTData>({
        carbonIntensity: BASE_INTENSITY,
        energyConsumption: BASE_ENERGY,
        furnaceTemp: BASE_TEMP,
        timestamp: new Date().toISOString(),
    });

    const [anomaly, setAnomaly] = useState<boolean>(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setData(prev => {
                // Add slight random fluctuation to simulate real sensor noise
                const noise = (Math.random() - 0.5) * 0.1;

                // Occasionally trigger a "spike" if anomaly mode is active
                const spike = anomaly ? (Math.random() > 0.7 ? 0.8 : 0) : 0;

                return {
                    carbonIntensity: +(BASE_INTENSITY + noise + spike).toFixed(2),
                    energyConsumption: Math.round(BASE_ENERGY + (noise * 100) + (spike * 200)),
                    furnaceTemp: Math.round(BASE_TEMP + (noise * 50)),
                    timestamp: new Date().toISOString(),
                };
            });
        }, 2000); // 2 seconds interval is efficient for UI updates

        return () => clearInterval(interval);
    }, [anomaly]);

    // Function to manually trigger an anomaly for the demo flow
    const triggerAnomaly = () => setAnomaly(true);
    const resolveAnomaly = () => setAnomaly(false);

    return { data, isAnomaly: anomaly, triggerAnomaly, resolveAnomaly };
};
