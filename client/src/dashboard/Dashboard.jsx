import {
  Car,
  Users,
  MapPin,
  Building,
  Activity,
  TrendingUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Typography,
  Box,
} from "@mui/material";

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

const Dashboard = ({ userRole }) => {
  const metrics = userRole === "superadmin" ? superadminMetrics : adminMetrics;

  return (
    <div className="space-y-6 mt-6 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="fleet-card relative overflow-hidden group"
            elevation={3}
          >
            <Box className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader
              className="flex flex-row items-center justify-between space-y-0 pb-3"
              title={
                <Typography
                  variant="caption"
                  className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
                >
                  {metric.title}
                </Typography>
              }
              action={
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <metric.icon className="h-5 w-5 text-primary" />
                </div>
              }
            />
            <CardContent className="relative">
              <div className="flex items-center gap-4">
                <Typography
                  variant="h5"
                  className="text-3xl font-bold text-foreground animate-data-refresh"
                >
                  {metric.value}
                </Typography>
                <Chip
                  label={
                    <div className="flex items-center gap-1.5">
                      {metric.changeType === "increase" && (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {metric.change}
                    </div>
                  }
                  className={`text-sm font-medium px-2 py-1 rounded-full ${
                    metric.changeType === "increase"
                      ? "text-success bg-success/10 border border-success/20"
                      : "text-muted-foreground bg-muted/50"
                  }`}
                />
              </div>
              <Typography
                variant="body2"
                className="text-sm text-muted-foreground mt-2 font-medium"
              >
                {metric.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <Card className="fleet-card" elevation={3}>
          <CardHeader className="pb-4">
            <Typography
              variant="h6"
              className="text-xl flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-6 w-6 text-primary" />
              </div>
              Recent Activity
            </Typography>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-xl bg-gradient-to-r from-success/10 to-transparent border border-success/20">
                <div className="w-3 h-3 bg-success rounded-full mt-1 animate-live-pulse"></div>
                <div className="flex-1">
                  <Typography
                    variant="body1"
                    className="text-sm font-semibold text-foreground"
                  >
                    Device TR-001 came online
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-xs text-muted-foreground mt-1"
                  >
                    Connected to GPS network • 2 minutes ago
                  </Typography>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-xl bg-gradient-to-r from-warning/10 to-transparent border border-warning/20">
                <div className="w-3 h-3 bg-warning rounded-full mt-1"></div>
                <div className="flex-1">
                  <Typography
                    variant="body1"
                    className="text-sm font-semibold text-foreground"
                  >
                    Speed limit exceeded - Vehicle TR-045
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-xs text-muted-foreground mt-1"
                  >
                    90 km/h in 70 km/h zone • 5 minutes ago
                  </Typography>
                </div>
              </div>
              <div className="flex items-start gap-4 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                <div className="w-3 h-3 bg-primary rounded-full mt-1"></div>
                <div className="flex-1">
                  <Typography
                    variant="body1"
                    className="text-sm font-semibold text-foreground"
                  >
                    New driver John Smith assigned
                  </Typography>
                  <Typography
                    variant="body2"
                    className="text-xs text-muted-foreground mt-1"
                  >
                    Driver profile created and linked • 12 minutes ago
                  </Typography>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="fleet-card" elevation={3}>
          <CardHeader className="pb-4">
            <Typography
              variant="h6"
              className="text-xl flex items-center gap-3"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-6 w-6 text-primary" />
              </div>
              Fleet Status Overview
            </Typography>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[
                {
                  label: "Online",
                  percentage: "91%",
                  color: "success",
                  width: "91%",
                },
                {
                  label: "Moving",
                  percentage: "67%",
                  color: "primary",
                  width: "67%",
                },
                {
                  label: "Idle",
                  percentage: "24%",
                  color: "warning",
                  width: "24%",
                },
                {
                  label: "Offline",
                  percentage: "9%",
                  color: "destructive",
                  width: "9%",
                },
              ].map((status, index) => (
                <div
                  key={status.label}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 bg-${status.color} rounded-full ${
                        status.color === "success" ? "animate-live-pulse" : ""
                      }`}
                    ></div>
                    <Typography
                      variant="body1"
                      className="text-sm font-semibold text-foreground"
                    >
                      {status.label}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r from-${status.color} to-${status.color}/80 rounded-full transition-all duration-500`}
                        style={{ width: status.width }}
                      ></div>
                    </div>
                    <Typography
                      variant="body1"
                      className="text-sm font-bold text-foreground min-w-[3rem]"
                    >
                      {status.percentage}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
