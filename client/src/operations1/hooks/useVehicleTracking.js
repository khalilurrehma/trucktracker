import { useState, useEffect, useCallback, useRef } from "react";
// Simulates MQTT real-time updates for demo purposes
// Replace with actual MQTT connection when backend is ready
export const useVehicleTracking = (options) => {
    const { operationId, onVehicleUpdate } = options;
    const [vehicles, setVehicles] = useState([]);
    const [tracks, setTracks] = useState(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState("disconnected");
    const intervalRef = useRef(null);
    // Initialize mock vehicles for demo
    const initializeMockVehicles = useCallback(() => {
        return [
            {
                id: "7100655",
                name: "D5R-843 VOLQUETE",
                type: "truck",
                position: [-76.88, -15.48],
                lastUpdate: new Date().toLocaleTimeString(),
                efficiency: 45.5,
                trips: 12,
                fuelPerM3: 2.3,
                volumeM3: 156.8,
                cycleTime: "45m 22s",
                queueTime: "3m 15s",
                status: "active",
            },
            {
                id: "7100656",
                name: "D5Z-942 VOLQUETE",
                type: "truck",
                position: [-76.91, -15.51],
                lastUpdate: new Date().toLocaleTimeString(),
                efficiency: 68.2,
                trips: 18,
                fuelPerM3: 1.9,
                volumeM3: 234.5,
                cycleTime: "38m 10s",
                queueTime: "2m 45s",
                status: "active",
            },
            {
                id: "7438361",
                name: "Loader Piero",
                type: "loader",
                position: [-76.895, -15.495],
                lastUpdate: new Date().toLocaleTimeString(),
                efficiency: 82.1,
                trips: 45,
                fuelPerM3: 0.8,
                volumeM3: 890.2,
                cycleTime: "12m 05s",
                queueTime: "0s",
                status: "active",
            },
            {
                id: "7100602",
                name: "D5L-928 VOLQUETE",
                type: "truck",
                position: [-76.87, -15.52],
                lastUpdate: new Date().toLocaleTimeString(),
                efficiency: 52.8,
                trips: 8,
                fuelPerM3: 2.1,
                volumeM3: 120.5,
                cycleTime: "52m 30s",
                queueTime: "5m 10s",
                status: "idle",
            },
        ];
    }, []);
    // Simulate vehicle movement
    const simulateVehicleMovement = useCallback(() => {
        setVehicles((prevVehicles) => {
            return prevVehicles.map((vehicle) => {
                if (vehicle.status !== "active")
                    return vehicle;
                // Random small movement
                const movementScale = 0.0005;
                const newLng = vehicle.position[0] + (Math.random() - 0.5) * movementScale;
                const newLat = vehicle.position[1] + (Math.random() - 0.5) * movementScale;
                const newPosition = [newLng, newLat];
                // Update track history
                setTracks((prevTracks) => {
                    const newTracks = new Map(prevTracks);
                    const existingTrack = newTracks.get(vehicle.id);
                    if (existingTrack) {
                        const positions = [...existingTrack.positions, newPosition];
                        // Keep last 100 positions for the trail
                        if (positions.length > 100)
                            positions.shift();
                        newTracks.set(vehicle.id, Object.assign(Object.assign({}, existingTrack), { positions }));
                    }
                    else {
                        newTracks.set(vehicle.id, {
                            vehicleId: vehicle.id,
                            positions: [vehicle.position, newPosition],
                            color: vehicle.type === "truck" ? "#ef4444" : "#f59e0b",
                        });
                    }
                    return newTracks;
                });
                const updatedVehicle = Object.assign(Object.assign({}, vehicle), { position: newPosition, lastUpdate: new Date().toLocaleTimeString() });
                onVehicleUpdate === null || onVehicleUpdate === void 0 ? void 0 : onVehicleUpdate(updatedVehicle);
                return updatedVehicle;
            });
        });
    }, [onVehicleUpdate]);
    // Connect to MQTT (simulated for now)
    const connect = useCallback(() => {
        setConnectionStatus("connecting");
        console.log(`[MQTT] Connecting to operation ${operationId}...`);
        // Simulate connection delay
        setTimeout(() => {
            setIsConnected(true);
            setConnectionStatus("connected");
            console.log("[MQTT] Connected successfully");
            // Initialize vehicles
            setVehicles(initializeMockVehicles());
            // Start simulating updates every 2 seconds
            intervalRef.current = setInterval(simulateVehicleMovement, 2000);
        }, 1000);
    }, [operationId, initializeMockVehicles, simulateVehicleMovement]);
    // Disconnect from MQTT
    const disconnect = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsConnected(false);
        setConnectionStatus("disconnected");
        console.log("[MQTT] Disconnected");
    }, []);
    // Get track GeoJSON for a vehicle
    const getTrackGeoJSON = useCallback((vehicleId) => {
        const track = tracks.get(vehicleId);
        if (!track || track.positions.length < 2)
            return null;
        return {
            type: "Feature",
            properties: { vehicleId, color: track.color },
            geometry: {
                type: "LineString",
                coordinates: track.positions,
            },
        };
    }, [tracks]);
    // Get all tracks as GeoJSON FeatureCollection
    const getAllTracksGeoJSON = useCallback(() => {
        const features = [];
        tracks.forEach((track) => {
            if (track.positions.length >= 2) {
                features.push({
                    type: "Feature",
                    properties: { vehicleId: track.vehicleId, color: track.color },
                    geometry: {
                        type: "LineString",
                        coordinates: track.positions,
                    },
                });
            }
        });
        return {
            type: "FeatureCollection",
            features,
        };
    }, [tracks]);
    // Clear track history
    const clearTracks = useCallback(() => {
        setTracks(new Map());
    }, []);
    // Auto-connect on mount
    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);
    return {
        vehicles,
        tracks,
        isConnected,
        connectionStatus,
        connect,
        disconnect,
        getTrackGeoJSON,
        getAllTracksGeoJSON,
        clearTracks,
    };
};
