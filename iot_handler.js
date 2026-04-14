import express from 'express';
import bodyParser from 'body-parser';

export default class IoTHandler {
    constructor(broadcastFunc) {
        this.app = express();
        this.app.use(bodyParser.json());
        this.sensorData = {};
        this.broadcastFunc = broadcastFunc;
        this.deviceStatus = {
            led: "OFF",
            relay: "OFF"
        };
    }

    init(port) {
        this.app.post('/api/sensor', (req, res) => {
            const { sensor, value, unit, deviceId } = req.body;
            console.log(`[IoT] Data received from ${deviceId}: ${sensor} = ${value}${unit}`);
            
            this.sensorData[sensor] = { value, unit, timestamp: new Date() };
            
            if (sensor === 'temperature' && value > 40) {
                this.broadcastFunc(`⚠️ ALERT: Suhu tinggi terdeteksi! (${value}${unit})`);
            }

            res.status(200).json({ status: 'success', commands: this.deviceStatus });
        });

        this.app.get('/api/control', (req, res) => {
            res.status(200).json(this.deviceStatus);
        });

        this.app.listen(port, () => {
            console.log(`[IoT] Server running on port ${port}`);
        });
    }

    setDeviceStatus(key, status) {
        if (this.deviceStatus.hasOwnProperty(key)) {
            this.deviceStatus[key] = status.toUpperCase();
            return true;
        }
        return false;
    }

    getLatestData() {
        if (Object.keys(this.sensorData).length === 0) return "Belum ada data sensor yang masuk.";
        return Object.entries(this.sensorData)
            .map(([k, v]) => `- ${k}: ${v.value}${v.unit} (${v.timestamp.toLocaleTimeString()})`)
            .join('\n');
    }
}
