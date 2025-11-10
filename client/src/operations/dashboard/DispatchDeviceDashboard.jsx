import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDevicesByGeofence } from "../../apis/deviceAssignmentApi";
import { fetchMultipleOperationKPIs } from "../../apis/dashboardApi";

import {
  Package,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Fuel,
  Truck,
  Users,
  Activity,
  Target,
  AlertCircle,
} from "lucide-react";

import { MetricCard } from "./components/MetricCard";
import { EfficiencyGauge } from "./components/EfficiencyGauge";
import { CycleBreakdown } from "./components/CycleBreakdown";
import { EfficiencyChart } from "./components/EfficiencyChart";
import { StatusCard } from "./components/StatusCard";

import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

const Index = () => {
  const { id } = useParams();
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs());

  useEffect(() => {
    if (!id) return;

    const fetchKPIs = async () => {
      try {
        setLoading(true);

        // 1️⃣ Get all devices in this geofence
        const devices = await getDevicesByGeofence(id);
        const deviceIds = devices.map((d) => d.device_id || d.flespiId).filter(Boolean);
        if (!deviceIds.length) {
          console.warn("⚠️ No devices found for geofence:", id);
          setKpi(null);
          return;
        }

        // 2️⃣ Fetch KPI data
        const response = await fetchMultipleOperationKPIs(deviceIds);
        const rawData = response || [];

        if (!Array.isArray(rawData) || !rawData.length) {
          setKpi(null);
          return;
        }

        // 3️⃣ Flatten each record (merge op_data + summary_data)
        // 3️⃣ Flatten & aggregate KPIs
        const flattened = rawData.map((d) => {
          const op = d.data.op_data || {};
          const summary = d.data.summary_data || {};

          return {
            operation_efficiency_pct: d.data.operation_efficiency_pct ?? 0,
            operation_total_m3:
              d.data.operation_total_m3 ?? summary.operation_metadata?.operation_total_volume_m3 ?? 0,
            total_material_moved_m3: d.data.total_material_moved_m3 ?? summary.total_material_moved_m3 ?? 0,
            material_moved_today: d.data.material_moved_today_m3 ?? summary.material_moved_today ?? 0,
            remaining_material_m3: d.data.remaining_material_m3 ?? summary.remaining_material_m3 ?? 0,
            ETA_completion_h: d.data.ETA_completion_h ?? summary.ETA_completion_h ?? 0,
            active_vehicles: d.data.Active_vehicles ?? op.op_vehicle_count ?? 0,
            active_loaders: d.data.active_loaders ?? op.op_loaders_count ?? 0,
            avg_cycle_time_min: d.data.avg_cycle_time_min ?? op.op_avg_cycle_duration ?? 0,
            avg_queue_time_min: d.data.avg_queue_time_min ?? op.op_avg_queue_time ?? 0,
            day_productivity: d.data.day_productivity ?? 0,
            total_trips_today: d.data.total_trips_today ?? 0,
            trip_productivity: d.data.trip_productivity ?? 0,
            day_goal_achievement: d.data.day_goal_achievement ?? summary.average_op_efficiency ?? 0,
            energy_efficiency_lm3: d.data.energy_efficiency_lm3 ?? op.avg_energy_efficiency_lm3 ?? 0,
            total_haul_distance: op.avg_haul_distance_km ?? 0,

            // Cycle breakdown
            load_cycle: op.load_cycle ?? 0,
            haul_cycle: op.haul_cycle ?? 0,
            dump_cycle: op.dump_cycle ?? 0,
            queue_cycle: op.Queue_cycle ?? 0,
            return_cycle: op.return_cycle ?? 0,

            // Efficiency history
            last_10_op_efficiency: d.last_10_op_efficiency ?? [],
          };
        });

        // 4️⃣ Aggregate top metrics
        const aggregate = (key, avg = false) => {
          const values = flattened.map((v) => Number(v[key] ?? 0));
          if (values.length === 0) return 0;
          const sum = values.reduce((a, b) => a + b, 0);
          return avg ? sum / values.length : sum;
        };

        const combined = {
          operationEfficiency: aggregate("operation_efficiency_pct", true),
          operationTotal: aggregate("operation_total_m3"),
          totalMoved: aggregate("total_material_moved_m3"),
          materialToday: aggregate("material_moved_today"),
          remainingMaterial: aggregate("remaining_material_m3"),
          ETA: aggregate("ETA_completion_h", true),
          activeVehicles: aggregate("active_vehicles"),
          activeLoaders: aggregate("active_loaders"),
          avgCycleTime: aggregate("avg_cycle_time_min", true),
          avgQueueTime: aggregate("avg_queue_time_min", true),
          dayProductivity: aggregate("day_productivity", true),
          totalTrips: aggregate("total_trips_today"),
          tripProductivity: aggregate("trip_productivity", true),
          dayGoal: aggregate("day_goal_achievement", true),
          energyEfficiency: aggregate("energy_efficiency_lm3", true),
          totalHaulDistance: aggregate("total_haul_distance", true),

          // Cycle breakdown averages
          cycleBreakdown: {
            load: aggregate("load_cycle", true),
            haul: aggregate("haul_cycle", true),
            dump: aggregate("dump_cycle", true),
            queue: aggregate("queue_cycle", true),
            ret: aggregate("return_cycle", true),
          },

          // Efficiency chart (merged across devices)
          last10Efficiency: flattened.flatMap((f) => f.last_10_op_efficiency || []),
        };

        setKpi(combined);

      } catch (error) {
        console.error("❌ Dashboard fetch error:", error);
        setKpi(null);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, 60000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (!kpi) return <div className="p-6">No KPI data available for this geofence.</div>;

  const safe = (val, digits = 2) => Number(val ?? 0).toFixed(digits);

  return (
    <div className="min-h-screen bg-background p-6 fade-in">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Operation Dashboard — Geofence {id}
            </h1>
            <p className="text-muted-foreground">
              Aggregated KPIs for all devices in this geofence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
              <Activity className="w-5 h-5 text-success animate-pulse" />
              <span className="text-sm font-medium text-success">Live</span>
            </div>

            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Select Date"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                slotProps={{
                  textField: {
                    size: "small",
                    className:
                      "bg-background border border-muted rounded-md w-[160px]",
                  },
                }}
              />
            </LocalizationProvider>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Operation Total" value={safe(kpi.totalMaterial)} subtitle="m³" icon={Package} />
          <MetricCard title="Total Material Moved" value={safe(kpi.totalMoved)} subtitle="m³" icon={TrendingUp} />
          <MetricCard title="Material Moved Today" value={safe(kpi.materialToday)} subtitle="m³" icon={TrendingUp} />
          <MetricCard title="Remaining Material" value={safe(kpi.remaining)} subtitle="m³" icon={TrendingDown} />
          <MetricCard title="ETA to Completion" value={safe(kpi.ETA)} subtitle="hours" icon={Clock} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="AVG Cycle Time" value={safe(kpi.avgCycle)} subtitle="min" icon={Clock} />
          <MetricCard title="AVG Queue Time" value={safe(kpi.queueTime)} subtitle="min" icon={AlertCircle} />
          <MetricCard title="Day Productivity" value={safe(kpi.dayProductivity)} subtitle="m³/h" icon={Zap} />
          <MetricCard title="Trip Productivity" value={safe(kpi.tripProductivity)} subtitle="m³/trip" icon={Activity} />
          <MetricCard title="Energy Efficiency" value={safe(kpi.energyEfficiency)} subtitle="L/m³" icon={Fuel} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CycleBreakdown />
          <div className="lg:col-span-2">
            <EfficiencyChart delay={200} />
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EfficiencyGauge value={Number(kpi.efficiency ?? 0)} title="Operation Efficiency" />
          <StatusCard title="Shift Goal Achievement" value={`${safe(kpi.dayGoal, 1)}%`} icon={Target} variant="success" />
          <StatusCard title="Active Trucks" value={kpi.vehicles ?? 0} icon={Truck} variant="warning" />
          <StatusCard title="Active Loaders" value={kpi.loaders ?? 0} icon={Users} variant="success" />
        </div>

        {/* Bottom Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard title="Total Trips Today" value={kpi.totalTrips ?? 0} icon={Activity} variant="info" />
          <StatusCard title="Failures" value="0" subtitle="Maintenance required" icon={AlertCircle} variant="warning" />
          <StatusCard title="Average Load Time" value={`${safe(kpi.loadCycle)} min`} icon={Clock} variant="primary" />
        </div>
      </div>
    </div>
  );
};

export default Index;
