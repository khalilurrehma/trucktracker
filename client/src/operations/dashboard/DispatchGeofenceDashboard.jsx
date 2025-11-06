import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getDevicesByGeofence
} from "../../apis/deviceAssignmentApi";
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

const Index = () => {
  const { id } = useParams(); // 👈 Geofence ID
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // 2️⃣ Fetch KPI data from backend
    const response = await fetchMultipleOperationKPIs(deviceIds);

    // ✅ New backend response format
    const data = response || []; // <- nested "data" field
    if (!data.length) {
      setKpi(null);
      return;
    }

    // 3️⃣ Aggregate KPIs
    const aggregate = (key, avg = false) => {
      const values = data.map((v) => Number(v[key] ?? 0));
      if (values.length === 0) return 0;
      const sum = values.reduce((a, b) => a + b, 0);
      return avg ? sum / values.length : sum;
    };

    const combined = {
      totalMaterial: aggregate("op_total_volume_m3"),
      totalMoved: aggregate("total_material_moved_m3"),
      materialToday: aggregate("material_moved_today"),
      remaining: aggregate("remaining_material_m3"),
      ETA: aggregate("ETA_completion_h", true),
      vehicles: aggregate("op_vehicle_count"),
      loaders: aggregate("op_loaders_count"),
      avgCycle: aggregate("avg_cycle_volume_m3", true),
      queueTime: aggregate("op_avg_queue_time", true),
      dayProductivity: aggregate("Day_productivity", true),
      tripProductivity: aggregate("trip_productivity", true),
      energyEfficiency: aggregate("energy_efficiency_lm3", true),
      efficiency: aggregate("cycle_efficiency", true),
      dayGoal: aggregate("day_goal_achievement", true),
      totalTrips: aggregate("cycle_haul_trips_count"),
      loadCycle: aggregate("load_cycle", true),
    };

    setKpi(combined);
  } catch (error) {
    console.error("Dashboard fetch error:", error);
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
            <Activity className="w-5 h-5 text-success animate-pulse" />
            <span className="text-sm font-medium text-success">Live</span>
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
