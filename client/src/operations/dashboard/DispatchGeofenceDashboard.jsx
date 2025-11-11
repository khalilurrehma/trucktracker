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
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
const useSystemTheme = () => {
  const [theme, setTheme] = useState(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e) => setTheme(e.matches ? "dark" : "light");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  return theme;
};
const Index = () => {
  const { id } = useParams();
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(dayjs().tz("America/Lima")); // ✅ Default to today (GMT-5)
  const theme = useSystemTheme();

  useEffect(() => {
    if (!id) return;

    const fetchKPIs = async () => {
      try {
        setLoading(true);
        const devices = await getDevicesByGeofence(id);
        const deviceIds = devices.map((d) => d.device_id || d.flespiId).filter(Boolean);
        if (!deviceIds.length) {
          setKpi(null);
          return;
        }

        const response = await fetchMultipleOperationKPIs(deviceIds);
        const rawData = response || [];
        if (!Array.isArray(rawData) || !rawData.length) {
          setKpi(null);
          return;
        }

        // 🕐 Handle date range (GMT-5)
        let filtered = rawData;
        if (selectedDate) {
          const startOfDay = selectedDate.tz("America/Lima").startOf("day").unix();
          const endOfDay = selectedDate.tz("America/Lima").endOf("day").unix();

          filtered = rawData.filter((d) => {
            const inner = d.data || d;
            const begin = Number(inner.begin || 0);
            const end = Number(inner.end || 0);
            return begin >= startOfDay && end <= endOfDay;
          });

          console.log(`📅 Filtered data from ${startOfDay} → ${endOfDay} (GMT-5)`);
        }

        const flattened = filtered.map((d) => {
          const inner = d.data || d;
          const op = inner.op_data || {};
          const summary = inner.summary_data || {};

          return {
            operation_efficiency_pct: inner.operation_efficiency_pct ?? 0,
            operation_total_m3: inner.operation_total_m3 ?? summary.operation_metadata?.operation_total_volume_m3 ?? 0,
            material_moved_today_m3: inner.material_moved_today_m3 ?? summary.material_moved_today ?? 0,
            remaining_material_m3: inner.remaining_material_m3 ?? summary.remaining_material_m3 ?? 0,
            ETA_completion_h: inner.ETA_completion_h ?? summary.ETA_completion_h ?? 0,
            active_vehicles: inner.Active_vehicles ?? op.op_vehicle_count ?? 0,
            active_loaders: inner.active_loaders ?? op.op_loaders_count ?? 0,
            avg_cycle_time_min: inner.avg_cycle_time_min ?? op.op_avg_cycle_duration ?? 0,
            avg_queue_time_min: inner.avg_queue_time_min ?? op.op_avg_queue_time ?? 0,
            day_productivity: inner.day_productivity ?? 0,
            total_trips_today: inner.total_trips_today ?? 0,
            trip_productivity: inner.trip_productivity ?? 0,
            day_goal_achievement: inner.day_goal_achievement ?? summary.average_op_efficiency ?? 0,
            energy_efficiency_lm3: inner.energy_efficiency_lm3 ?? op.avg_energy_efficiency_lm3 ?? 0,
            total_haul_distance: op.avg_haul_distance_km ?? 0,
            load_cycle: op.load_cycle ?? 0,
            haul_cycle: op.haul_cycle ?? 0,
            dump_cycle: op.dump_cycle ?? 0,
            queue_cycle: op.Queue_cycle ?? 0,
            return_cycle: op.return_cycle ?? 0,
            last_10_op_efficiency: inner.last_10_op_efficiency ?? [],
          };
        });

        const aggregate = (key, avg = false) => {
          const values = flattened.map((v) => Number(v[key] ?? 0));
          if (!values.length) return 0;
          const sum = values.reduce((a, b) => a + b, 0);
          return avg ? sum / values.length : sum;
        };

        const combined = {
          operationEfficiency: aggregate("operation_efficiency_pct", true),
          operationTotal: aggregate("operation_total_m3"),
          totalMoved: aggregate("material_moved_today_m3"),
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

          cycleBreakdown: {
            load: aggregate("load_cycle", true),
            haul: aggregate("haul_cycle", true),
            dump: aggregate("dump_cycle", true),
            queue: aggregate("queue_cycle", true),
            ret: aggregate("return_cycle", true),
          },

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
  }, [id, selectedDate]); // ✅ re-fetch when date changes

  if (loading) return <div className="p-6">Loading dashboard...</div>;
  if (!kpi) return <div className="p-6">No KPI data available for this geofence.</div>;

  const safe = (val, digits = 2) => Number(val ?? 0).toFixed(digits);

  return (
    <div className={`min-h-screen p-6 fade-in ${theme === "dark" ? "bg-[#0a0a0a] text-gray-100" : "bg-white text-gray-900"
      }`}>
      <div className="max-w-[1800px] mx-auto space-y-6">

        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          {/* Left Section: Back + Title */}
          <div className="flex items-center gap-4">
            {/* 🔗 Back Button */}
            <a
              href="/operations/geofence/list"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors duration-300
            ${theme === "dark"
                  ? "border-gray-700 text-gray-200 hover:bg-[#1f1f1f]"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back
            </a>

            {/* Title & Subtitle */}
            <div>
              <h1
                className={`text-4xl font-bold mb-1 ${theme === "dark" ? "text-gray-100" : "text-gray-900"
                  }`}
              >
                Operation Dashboard — Geofence {id}
              </h1>
              <p
                className={`text-base ${theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}
              >
                Aggregated KPIs for all devices in this geofence
              </p>
            </div>
          </div>



          {/* Right Section: Live Badge + Date Picker */}
          {/* Right Section: Live Badge + Date Picker */}
          <div className="flex items-center gap-3">
            {/* 🔴 Live Badge */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-300 ${theme === "dark"
                  ? "bg-green-900/20 border-green-800 text-green-400"
                  : "bg-green-50 border-green-200 text-green-600"
                }`}
            >
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="text-sm font-medium">Live</span>
            </div>

            {/* 📅 Date Picker */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Select Date (GMT-5)"
                value={selectedDate}
                onChange={(newValue) => setSelectedDate(newValue)}
                maxDate={dayjs().tz("America/Lima").endOf("day")}
                disableFuture
                slotProps={{
                  textField: {
                    size: "small",
                    className: `${theme === "dark"
                        ? "bg-[#1f1f1f] border border-gray-700 text-gray-100"
                        : "bg-white border border-gray-300 text-gray-900"
                      } rounded-md w-[180px] transition-colors duration-300`,
                  },
                }}
                clearable
              />
            </LocalizationProvider>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="Operation Total" value={safe(kpi.operationTotal)} subtitle="m³" icon={Package} />
          <MetricCard title="Total Material Moved" value={safe(kpi.totalMoved)} subtitle="m³" icon={TrendingUp} />
          <MetricCard title="Remaining Material" value={safe(kpi.remainingMaterial)} subtitle="m³" icon={TrendingDown} />
          <MetricCard title="ETA to Completion" value={safe(kpi.ETA)} subtitle="hours" icon={Clock} />
          <MetricCard title="Energy Efficiency" value={safe(kpi.energyEfficiency)} subtitle="L/m³" icon={Fuel} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard title="AVG Cycle Time" value={safe(kpi.avgCycleTime)} subtitle="min" icon={Clock} />
          <MetricCard title="AVG Queue Time" value={safe(kpi.avgQueueTime)} subtitle="min" icon={AlertCircle} />
          <MetricCard title="Day Productivity" value={safe(kpi.dayProductivity)} subtitle="m³/h" icon={Zap} />
          <MetricCard title="Trip Productivity" value={safe(kpi.tripProductivity)} subtitle="m³/trip" icon={Activity} />
          <MetricCard title="Total Trips" value={kpi.totalTrips ?? 0} subtitle="count" icon={Truck} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <CycleBreakdown delay={100} value={kpi.cycleBreakdown} />
          <div className="lg:col-span-2">
            <EfficiencyChart delay={200} value={kpi.last10Efficiency} />
          </div>
        </div>

        {/* Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EfficiencyGauge value={Number(kpi.operationEfficiency ?? 0)} title="Operation Efficiency" />
          <StatusCard title="Shift Goal Achievement" value={`${safe(kpi.dayGoal, 1)}%`} icon={Target} variant="success" />
          <StatusCard title="Active Trucks" value={kpi.activeVehicles ?? 0} icon={Truck} variant="warning" />
          <StatusCard title="Active Loaders" value={kpi.activeLoaders ?? 0} icon={Users} variant="success" />
        </div>
      </div>
    </div>
  );
};

export default Index;
