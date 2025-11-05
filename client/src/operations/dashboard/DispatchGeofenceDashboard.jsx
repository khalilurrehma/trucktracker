import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getDashboardKPI } from "../../apis/dashboardApi";
import {
  Package, TrendingUp, TrendingDown, Clock, Zap, Fuel, Truck, Users,
  Activity, Target, AlertCircle
} from "lucide-react";
import { MetricCard } from "./components/MetricCard";
import { EfficiencyGauge } from "./components/EfficiencyGauge";
import { CycleBreakdown } from "./components/CycleBreakdown";
import { EfficiencyChart } from "./components/EfficiencyChart";
import { StatusCard } from "./components/StatusCard";

const Index = () => {
  const { id } = useParams(); // 👈 get device ID from URL
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return; // prevent running before param exists

    const fetchKPIs = async () => {
      try {
        const res = await getDashboardKPI(id);
        setData(res);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, 60000); // auto-refresh every minute
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (!data) return <div className="p-6">No KPI data available.</div>;

  const kpi = data.device || {};

  // ✅ Safe numeric conversions for display
  const safe = (val, digits = 2) => Number(val ?? 0).toFixed(digits);

  return (
    <div className="min-h-screen bg-background p-6 fade-in">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Device Dashboard — {id}
            </h1>
            <p className="text-muted-foreground">
              Real-time fleet and material tracking
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
