import {
  Car,
  Users,
  MapPin,
  Building,
  Activity,
  TrendingUp,
  Briefcase,
  ClipboardList,
  Clock,
  Shield,
  ArrowLeft,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Grid,
  useTheme,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from "@mui/lab";
import { Line, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { useNavigate } from "react-router-dom";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const adminMetrics = [
  {
    title: "Total Devices",
    value: "147",
    change: "+12",
    changeType: "increase",
    icon: Car,
    description: "Active vehicles",
  },
  {
    title: "Active Drivers",
    value: "89",
    change: "+3",
    changeType: "increase",
    icon: Users,
    description: "Registered drivers",
  },
  {
    title: "Active Groups",
    value: "134",
    change: "91%",
    changeType: "neutral",
    icon: Activity,
    description: "Currently online",
  },
  {
    title: "Geofences",
    value: "23",
    change: "+2",
    changeType: "increase",
    icon: MapPin,
    description: "Active zones",
  },
];

const superadminMetrics = [
  {
    title: "Companies",
    value: "24",
    change: "+2",
    changeType: "increase",
    icon: Building,
    description: "Active companies",
  },
  {
    title: "Total Devices",
    value: "1,247",
    change: "+89",
    changeType: "increase",
    icon: Car,
    description: "All vehicles",
  },
  {
    title: "Online Rate",
    value: "87%",
    change: "+2%",
    changeType: "increase",
    icon: Activity,
    description: "System-wide",
  },
  {
    title: "Total Drivers",
    value: "892",
    change: "+45",
    changeType: "increase",
    icon: Users,
    description: "All drivers",
  },
];

const driverMetrics = [
  {
    title: "Avg Trip Duration",
    value: "32 min",
    change: "-2 min",
    changeType: "decrease",
    icon: Clock,
    description: "Last 30 days",
  },
  {
    title: "Safety Score",
    value: "92%",
    change: "+5%",
    changeType: "increase",
    icon: Shield,
    description: "Driver compliance",
  },
];

const echongCases = [
  {
    id: "EC-001",
    title: "Engine Overheat",
    status: "Open",
    created: "2025-08-08",
  },
  {
    id: "EC-002",
    title: "GPS Signal Lost",
    status: "In Progress",
    created: "2025-08-09",
  },
  {
    id: "EC-003",
    title: "Low Battery Alert",
    status: "Resolved",
    created: "2025-08-10",
  },
];

const rimacCases = [
  {
    id: "RC-101",
    title: "Speed Violation",
    status: "Open",
    created: "2025-08-07",
  },
  {
    id: "RC-102",
    title: "Unauthorized Access",
    status: "Open",
    created: "2025-08-09",
  },
  {
    id: "RC-103",
    title: "Maintenance Required",
    status: "Closed",
    created: "2025-08-10",
  },
];

const recentAlerts = [
  {
    id: "AL-001",
    type: "Critical Error",
    message: "Device offline",
    time: "2025-08-12 10:15",
    status: "Open",
  },
  {
    id: "AL-002",
    type: "Maintenance",
    message: "Oil change due",
    time: "2025-08-12 09:30",
    status: "Pending",
  },
  {
    id: "AL-003",
    type: "Security Alert",
    message: "Unauthorized access attempt",
    time: "2025-08-12 08:45",
    status: "Resolved",
  },
];

const StyledCard = styled(Card)(({ theme }) => ({
  transition: "all 0.3s ease-in-out",
  backgroundColor:
    theme.palette.mode === "dark"
      ? theme.palette.grey[800]
      : theme.palette.background.paper,
  "&:hover": {
    transform: "translateY(-4px)",
    boxShadow: theme.shadows[8],
  },
}));
const getChangeColor = (changeType, isDark) => {
  switch (changeType) {
    case "increase":
      return isDark
        ? "bg-green-900 text-green-200"
        : "bg-green-100 text-green-800";
    case "decrease":
      return isDark ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
    default:
      return isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800";
  }
};

const getStatusColor = (status, isDark) => {
  switch (status) {
    case "Open":
    case "Critical Error":
      return isDark ? "bg-red-900 text-red-200" : "bg-red-100 text-red-800";
    case "In Progress":
    case "Pending":
      return isDark
        ? "bg-yellow-900 text-yellow-200"
        : "bg-yellow-100 text-yellow-800";
    case "Resolved":
    case "Closed":
      return isDark
        ? "bg-green-900 text-green-200"
        : "bg-green-100 text-green-800";
    default:
      return isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-800";
  }
};

const getChartColors = (isDark) => ({
  text: isDark ? "#E5E7EB" : "#1F2937",
  grid: isDark ? "#4B5563" : "#E5E7EB",
  deviceBorder: isDark ? "#60A5FA" : "#3B82F6",
  deviceBg: isDark ? "rgba(96, 165, 250, 0.2)" : "rgba(59, 130, 246, 0.2)",
  driverBorder: isDark ? "#34D399" : "#10B981",
  driverBg: isDark ? "rgba(52, 211, 153, 0.2)" : "rgba(16, 185, 129, 0.2)",
  violationColors: isDark
    ? ["#F87171", "#FBBF24", "#60A5FA"]
    : ["#EF4444", "#F59E0B", "#3B82F6"],
});

const MetricCard = ({
  title,
  value,
  change,
  changeType,
  Icon,
  description,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <StyledCard>
      <CardContent className="p-6">
        <Box className="flex items-center justify-between">
          <Box>
            <Typography
              variant="h6"
              className={
                isDark
                  ? "text-gray-300 font-medium"
                  : "text-gray-600 font-medium"
              }
            >
              {title}
            </Typography>
            <Typography variant="h4" className="font-bold mt-1">
              {value}
            </Typography>
            <Box className="flex items-center mt-2">
              <Chip
                label={change}
                className={`text-sm ${getChangeColor(changeType, isDark)}`}
                size="small"
              />
              <Typography
                variant="body2"
                className={`ml-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {description}
              </Typography>
            </Box>
          </Box>
          <Box
            className={
              isDark
                ? "bg-blue-900 p-3 rounded-full"
                : "bg-blue-100 p-3 rounded-full"
            }
          >
            <Icon
              className={
                isDark ? "h-6 w-6 text-blue-400" : "h-6 w-6 text-blue-600"
              }
            />
          </Box>
        </Box>
      </CardContent>
    </StyledCard>
  );
};

const CaseTable = ({ title, cases }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      sx={{
        backgroundColor: isDark
          ? theme.palette.grey[800]
          : theme.palette.background.paper,
      }}
    >
      <CardHeader
        title={
          <Typography
            variant="h6"
            className={isDark ? "text-gray-200 font-semibold" : "font-semibold"}
          >
            {title}
          </Typography>
        }
      />
      <CardContent>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell
                className={
                  isDark ? "text-gray-200 font-semibold" : "font-semibold"
                }
              >
                Case ID
              </TableCell>
              <TableCell
                className={
                  isDark ? "text-gray-200 font-semibold" : "font-semibold"
                }
              >
                Title
              </TableCell>
              <TableCell
                className={
                  isDark ? "text-gray-200 font-semibold" : "font-semibold"
                }
              >
                Status
              </TableCell>
              <TableCell
                className={
                  isDark ? "text-gray-200 font-semibold" : "font-semibold"
                }
              >
                Created
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cases.map((caseItem) => (
              <TableRow
                key={caseItem.id}
                className={isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}
              >
                <TableCell className={isDark ? "text-gray-300" : ""}>
                  {caseItem.id}
                </TableCell>
                <TableCell className={isDark ? "text-gray-300" : ""}>
                  {caseItem.title}
                </TableCell>
                <TableCell>
                  <Chip
                    label={caseItem.status}
                    className={`text-sm ${getStatusColor(
                      caseItem.status,
                      isDark
                    )}`}
                    size="small"
                  />
                </TableCell>
                <TableCell className={isDark ? "text-gray-300" : ""}>
                  {caseItem.created}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const ActivityChart = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = getChartColors(isDark);

  const data = {
    labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"],
    datasets: [
      {
        label: "Device Activity",
        data: [120, 150, 130, 170, 200, 180, 210],
        borderColor: colors.deviceBorder,
        backgroundColor: colors.deviceBg,
        fill: true,
        tension: 0.4,
      },
      {
        label: "Driver Activity",
        data: [80, 90, 100, 110, 120, 115, 130],
        borderColor: colors.driverBorder,
        backgroundColor: colors.driverBg,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { color: colors.text } },
      title: {
        display: true,
        text: "Real-Time System Activity",
        color: colors.text,
      },
    },
    scales: {
      x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
      y: {
        ticks: { color: colors.text },
        grid: { color: colors.grid },
        beginAtZero: true,
      },
    },
  };

  return <Line data={data} options={options} />;
};

const ViolationChart = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const colors = getChartColors(isDark);

  const data = {
    labels: ["Entry Violations", "Exit Violations", "Loitering"],
    datasets: [
      {
        data: [45, 30, 25],
        backgroundColor: colors.violationColors,
        borderColor: isDark ? "#374151" : "#1F2937",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "right", labels: { color: colors.text } },
      title: { display: true, text: "Geofence Violations", color: colors.text },
    },
  };

  return <Doughnut data={data} options={options} />;
};

const AlertsTimeline = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return (
    <Card
      sx={{
        backgroundColor: isDark
          ? theme.palette.grey[800]
          : theme.palette.background.paper,
      }}
    >
      <CardHeader
        title={
          <Typography
            variant="h6"
            className={isDark ? "text-gray-200 font-semibold" : "font-semibold"}
          >
            Recent Alerts
          </Typography>
        }
      />
      <CardContent>
        <Timeline position="alternate">
          {recentAlerts.map((alert, index) => (
            <TimelineItem key={alert.id}>
              <TimelineOppositeContent
                className={isDark ? "text-gray-400" : "text-gray-500"}
              >
                {alert.time}
              </TimelineOppositeContent>
              <TimelineSeparator>
                <TimelineDot
                  color={
                    alert.status === "Open"
                      ? "error"
                      : alert.status === "Pending"
                      ? "warning"
                      : "success"
                  }
                />
                {index < recentAlerts.length - 1 && <TimelineConnector />}
              </TimelineSeparator>
              <TimelineContent>
                <Typography className={isDark ? "text-gray-200" : ""}>
                  {alert.type}: {alert.message}
                </Typography>
                <Chip
                  label={alert.status}
                  className={`text-sm mt-1 ${getStatusColor(
                    alert.status,
                    isDark
                  )}`}
                  size="small"
                />
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  return (
    <Box
      className={`p-6 min-h-screen ${isDark ? "bg-gray-900" : "bg-gray-100"}`}
    >
      <Button
        startIcon={<ArrowLeft size={18} />}
        onClick={() => navigate(-1)} // Go back in history
        sx={{ mb: 2 }}
      >
        Back
      </Button>
      <Typography
        variant="h4"
        className={`font-bold mb-6 ${
          isDark ? "text-gray-100" : "text-gray-800"
        }`}
      >
        System Dashboard
      </Typography>

      {/* Admin Metrics */}
      <Typography
        variant="h5"
        className={`font-semibold mb-4 ${
          isDark ? "text-gray-200" : "text-gray-700"
        }`}
      >
        Admin Metrics
      </Typography>
      <Grid container spacing={3} className="mb-8">
        {adminMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              Icon={metric.icon}
              description={metric.description}
            />
          </Grid>
        ))}
      </Grid>

      {/* Superadmin Metrics */}
      <Typography
        variant="h5"
        className={`font-semibold mb-4 ${
          isDark ? "text-gray-200" : "text-gray-700"
        }`}
      >
        Superadmin Metrics
      </Typography>
      <Grid container spacing={3} className="mb-8">
        {superadminMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              Icon={metric.icon}
              description={metric.description}
            />
          </Grid>
        ))}
      </Grid>

      {/* Driver Performance */}
      <Typography
        variant="h5"
        className={`font-semibold mb-4 ${
          isDark ? "text-gray-200" : "text-gray-700"
        }`}
      >
        Driver Performance
      </Typography>
      <Grid container spacing={3} className="mb-8">
        {driverMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={6} key={index}>
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              Icon={metric.icon}
              description={metric.description}
            />
          </Grid>
        ))}
      </Grid>

      {/* Cases and Visuals Section */}
      <Grid container spacing={3} className="mb-8">
        <Grid item xs={12} md={6}>
          <CaseTable title="Echong Cases" cases={echongCases} />
        </Grid>
        <Grid item xs={12} md={6}>
          <CaseTable title="Rimac Cases" cases={rimacCases} />
        </Grid>
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              backgroundColor: isDark
                ? theme.palette.grey[800]
                : theme.palette.background.paper,
            }}
          >
            <CardHeader
              title={
                <Typography
                  variant="h6"
                  className={
                    isDark ? "text-gray-200 font-semibold" : "font-semibold"
                  }
                >
                  Geofence Violations
                </Typography>
              }
            />
            <CardContent>
              <ViolationChart />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <AlertsTimeline />
        </Grid>
      </Grid>

      {/* Activity Chart */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              backgroundColor: isDark
                ? theme.palette.grey[800]
                : theme.palette.background.paper,
            }}
          >
            <CardHeader
              title={
                <Typography
                  variant="h6"
                  className={
                    isDark ? "text-gray-200 font-semibold" : "font-semibold"
                  }
                >
                  Real-Time System Activity
                </Typography>
              }
            />
            <CardContent>
              <ActivityChart />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
