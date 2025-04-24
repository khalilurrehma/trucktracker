import React, { useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { LinearProgress } from "@mui/material";
import { useDispatch } from "react-redux";
import MainPage from "./main/MainPage";
import CombinedReportPage from "./reports/CombinedReportPage";
import RouteReportPage from "./reports/RouteReportPage";
import ServerPage from "./settings/ServerPage";
import UsersPage from "./settings/UsersPage";
import DevicePage from "./settings/DevicePage";
import UserPage from "./settings/UserPage";
import NewNotificationsPage from "./settings/NewNotificationsPage";
import NewNotificationPage from "./settings/NewNotification";
import GroupsPage from "./settings/GroupsPage";
import GroupPage from "./settings/GroupPage";
import PositionPage from "./other/PositionPage";
import NetworkPage from "./other/NetworkPage";
import EventReportPage from "./reports/EventReportPage";
import ReplayPage from "./other/ReplayPage";
import TripReportPage from "./reports/TripReportPage";
import StopReportPage from "./reports/StopReportPage";
import SummaryReportPage from "./reports/SummaryReportPage";
import ChartReportPage from "./reports/ChartReportPage";
import DriversPage from "./settings/DriversPage";
import DriverPage from "./settings/DriverPage";
import CalendarsPage from "./settings/CalendarsPage";
import CalendarPage from "./settings/CalendarPage";
import ComputedAttributesPage from "./settings/ComputedAttributesPage";
import ComputedAttributePage from "./settings/ComputedAttributePage";
import MaintenancesPage from "./settings/MaintenancesPage";
import MaintenancePage from "./settings/MaintenancePage";
import CommandsPage from "./settings/CommandsPage";
import CommandPage from "./settings/CommandPage";
import StatisticsPage from "./reports/StatisticsPage";
import LoginPage from "./login/LoginPage";
import RegisterPage from "./login/RegisterPage";
import ResetPasswordPage from "./login/ResetPasswordPage";
import GeofencesPage from "./other/GeofencesPage";
import GeofencePage from "./settings/GeofencePage";
import useQuery from "./common/util/useQuery";
import { useEffectAsync } from "./reactHelper";
import { devicesActions } from "./store";
import EventPage from "./other/EventPage";
import PreferencesPage from "./settings/PreferencesPage";
import AccumulatorsPage from "./settings/AccumulatorsPage";
import CommandDevicePage from "./settings/CommandDevicePage";
import CommandGroupPage from "./settings/CommandGroupPage";
import App from "./App";
import ChangeServerPage from "./login/ChangeServerPage";
import DevicesPage from "./settings/DevicesPage";
import ScheduledPage from "./reports/ScheduledPage";
import DeviceConnectionsPage from "./settings/DeviceConnectionsPage";
import GroupConnectionsPage from "./settings/GroupConnectionsPage";
import UserConnectionsPage from "./settings/UserConnectionsPage";
import LogsPage from "./reports/LogsPage";
import SharePage from "./settings/SharePage";
import AnnouncementPage from "./settings/AnnouncementPage";
import EmulatorPage from "./other/EmulatorPage";
import Loader from "./common/components/Loader";
import NewDispatchCase from "./reports/NewDispatchCase";
import DispatchResult from "./reports/DispatchResult";
import ViewNewCases from "./reports/ViewNewCases";
import UsageControl from "./settings/UsageControl";
import NewUsageControl from "./settings/NewUsageControl";
import ConfigShift from "./settings/ConfigShift";
import NewConfigShift from "./settings/NewConfigShift";
import NewDriverPage from "./settings/NewDriverPage";
import NewDriversPage from "./settings/NewDriversPage";
import VehiclesConfig from "./settings/VehiclesConfig";
import ControlUsage from "./settings/ControlUsage";
import EditControlUsage from "./settings/EditControlUsage";
import LocationPage from "./settings/components/LocationPage";
import DriverLiveLocation from "./settings/DriverLiveLocation";
import Shifts from "./settings/Shifts";
import NewShifts from "./settings/NewShifts";
import UsageControlLogs from "./settings/UsageControlLogs";
import UsageControlReport from "./reports/UsageControlReport";
import Realms from "./settings/Realms";
import Realm from "./settings/Realm";
import RealmUsers from "./settings/RealmUsers";
import RealmUser from "./settings/RealmUser";
import Subaccounts from "./settings/Subaccounts";
import Subaccount from "./settings/Subaccount";
import NewToken from "./settings/NewToken";
import SubaccountDashboard from "./settings/SubaccountDashboard";
import NewDevicesPage from "./settings/NewDevicesPage";
import NewDevicePage from "./settings/NewDevicePage";
import NewGroupsPage from "./settings/NewGroupsPage";
import NewGroupPage from "./settings/NewGroupPage";
import NewGeofencePage from "./settings/NewGeofence";
import NewGeofencesPage from "./other/NewGeofencesPage";
import RealmUserToken from "./settings/RealmUserToken";
import Calculators from "./settings/Calculators";
import RealmUserConnection from "./settings/RealmUserConnection";
import ViewCalculator from "./settings/ViewCalculator";
import Categories from "./settings/Categories";
import Reports from "./settings/Reports";
import NewCategory from "./settings/NewCategory";
import NewReports from "./settings/NewReports";
import CustomReport from "./reports/CustomReport";
import Calculator from "./settings/Calculator";
import CompanyDefaultCalcs from "./settings/CompanyDefaultCalcs";
import CompanyCustomCalcs from "./settings/CompanyCustomCalcs";
import CustomCalcDevicesPage from "./settings/CustomCalcDevicesPage";
import CustomCalcReports from "./settings/CustomCalcReports";
import DefaultCalcsPage from "./settings/DefaultCalcsPage";
import CustomCalcsPage from "./settings/CustomCalcsPage";
import NotificationLogsPage from "./settings/NotificationLogsPage";
import NotificationCalcsPage from "./settings/NotificationCalcsPage";
import MqttAlerts from "./operations/MqttAlerts";
import NewEventReportsPage from "./reports/NewEventReportsPage";
import DriverBehaviourReports from "./reports/DriverBehaviourReports";
import ProtocolNotifications from "./settings/ProtocolNotifications";
import ProtocolNotification from "./settings/ProtocolNotification";
import DeviceCustomCalcPage from "./settings/DeviceCustomCalcPage";
import DriversShifts from "./settings/DriversShifts";
import ScheduledDevicesLogs from "./reports/ScheduledDevicesLogs";

const Navigation = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [redirectsHandled, setRedirectsHandled] = useState(false);

  const { pathname } = useLocation();
  const query = useQuery();

  useEffectAsync(async () => {
    if (query.get("token")) {
      const token = query.get("token");
      await fetch(`/api/session?token=${encodeURIComponent(token)}`);
      navigate(pathname);
    } else if (query.get("deviceId")) {
      const deviceId = query.get("deviceId");
      const response = await fetch(`/api/devices?uniqueId=${deviceId}`);
      if (response.ok) {
        const items = await response.json();
        if (items.length > 0) {
          dispatch(devicesActions.selectId(items[0].id));
        }
      } else {
        throw Error(await response.text());
      }
      navigate("/");
    } else if (query.get("eventId")) {
      const eventId = parseInt(query.get("eventId"), 10);
      navigate(`/event/${eventId}`);
    } else {
      setRedirectsHandled(true);
    }
  }, [query]);

  if (!redirectsHandled) {
    return <LinearProgress />;
  }
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/change-server" element={<ChangeServerPage />} />
      <Route path="/" element={<App />}>
        <Route index element={<MainPage />} />

        <Route path="position/:id" element={<PositionPage />} />
        <Route path="network/:positionId" element={<NetworkPage />} />
        <Route path="event/:id" element={<EventPage />} />
        <Route path="replay" element={<ReplayPage />} />
        <Route path="emulator" element={<EmulatorPage />} />
        <Route path="new-geofences" element={<NewGeofencesPage />} />
        {/* <Route path="geofences" element={<GeofencesPage />} /> */}

        <Route path="settings">
          <Route path="categories" element={<Categories />} />
          <Route path="new-category" element={<NewCategory />} />
          <Route path="new-category/:categoryId" element={<NewCategory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="new-report" element={<NewReports />} />
          <Route path="new-report/:reportId" element={<NewReports />} />
          <Route path="calculators" element={<Calculators />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="calculator/:id" element={<Calculator />} />
          <Route
            path="company/default/calculators"
            element={<CompanyDefaultCalcs />}
          />
          <Route
            path="company/custom/calculators"
            element={<CompanyCustomCalcs />}
          />
          <Route
            path="company/custom/assign-devices/:calcId/:id"
            element={<CustomCalcDevicesPage />}
          />
          <Route
            path="admin/custom/assign-devices/:calcId"
            element={<CustomCalcDevicesPage />}
          />
          <Route
            path="assign/custom-calc/:deviceId"
            element={<DeviceCustomCalcPage />}
          />

          <Route path="calculator/:id" element={<Calculator />} />
          <Route path="realm/:id/user/:realmUserId" element={<RealmUser />} />
          <Route path="realm/:id/users" element={<RealmUsers />} />
          <Route path="realm/:id/user" element={<RealmUser />} />
          <Route path="realm/:id" element={<Realm />} />
          <Route path="realms" element={<Realms />} />
          <Route path="realm" element={<Realm />} />
          <Route
            path="live-location/:deviceId/:flespiId/auth-location/:lat/:long"
            element={<DriverLiveLocation />}
          />
          <Route path="shift/:id" element={<NewShifts />} />
          <Route path="shifts" element={<Shifts />} />
          <Route path="shift" element={<NewShifts />} />
          <Route path="location/:lat/:long" element={<LocationPage />} />
          <Route path="vehicles" element={<VehiclesConfig />} />
          <Route
            path="edit-control-usage/:id/:prevDriverId"
            element={<EditControlUsage />}
          />
          <Route path="config-shifts" element={<ConfigShift />} />
          <Route path="new-shift/:id/:driverId" element={<NewConfigShift />} />
          <Route path="new-shift" element={<NewConfigShift />} />
          <Route path="view-usage" element={<UsageControl />} />
          <Route path="new-control/:id" element={<NewUsageControl />} />
          <Route path="new-control" element={<NewUsageControl />} />
          <Route path="accumulators/:deviceId" element={<AccumulatorsPage />} />
          <Route path="announcement" element={<AnnouncementPage />} />
          <Route path="calendars" element={<CalendarsPage />} />
          <Route path="calendar/:id" element={<CalendarPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="commands" element={<CommandsPage />} />
          <Route path="command/:id" element={<CommandPage />} />
          <Route path="command" element={<CommandPage />} />
          <Route path="attributes" element={<ComputedAttributesPage />} />
          <Route path="attribute/:id" element={<ComputedAttributePage />} />
          <Route path="attribute" element={<ComputedAttributePage />} />
          <Route path="devices" element={<DevicesPage />} />
          <Route
            path="device/:id/connections"
            element={<DeviceConnectionsPage />}
          />
          <Route path="device/:id/command" element={<CommandDevicePage />} />
          <Route path="device/:id/share" element={<SharePage />} />
          <Route path="device/:id" element={<DevicePage />} />
          <Route path="device" element={<DevicePage />} />
          <Route path="new-device/:id" element={<NewDevicePage />} />
          <Route path="new-devices" element={<NewDevicesPage />} />
          <Route path="new-device" element={<NewDevicePage />} />
          <Route path="new-drivers" element={<NewDriversPage />} />
          <Route path="new-driver/:id" element={<NewDriverPage />} />
          <Route path="new-driver" element={<NewDriverPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="driver/:id" element={<DriverPage />} />
          <Route path="driver" element={<DriverPage />} />
          <Route path="drivers/shifts" element={<DriversShifts />} />
          <Route path="new-geofence/:id" element={<NewGeofencePage />} />
          <Route path="new-geofence" element={<NewGeofencePage />} />
          <Route path="geofence/:id" element={<GeofencePage />} />
          <Route path="geofence" element={<GeofencePage />} />
          <Route path="groups" element={<GroupsPage />} />
          <Route
            path="group/:id/connections"
            element={<GroupConnectionsPage />}
          />
          <Route path="group/:id/command" element={<CommandGroupPage />} />
          <Route path="group/:id" element={<GroupPage />} />
          <Route path="group" element={<GroupPage />} />
          <Route path="new-groups" element={<NewGroupsPage />} />
          <Route path="new-group" element={<NewGroupPage />} />
          <Route path="new-group/:id" element={<NewGroupPage />} />
          <Route path="maintenances" element={<MaintenancesPage />} />
          <Route path="maintenance/:id" element={<MaintenancePage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="notifications-logs" element={<NotificationLogsPage />} />
          <Route path="notifications" element={<NewNotificationsPage />} />
          <Route path="notification/:id" element={<NewNotificationPage />} />
          <Route path="notification" element={<NewNotificationPage />} />
          <Route
            path="protocol/notifications"
            element={<ProtocolNotifications />}
          />
          <Route
            path="protocol/notification"
            element={<ProtocolNotification />}
          />
          <Route
            path="protocol/notification/:id"
            element={<ProtocolNotification />}
          />
          <Route path="preferences" element={<PreferencesPage />} />
          <Route path="server" element={<ServerPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route
            path="user/:id/subaccount/:subaccountId/connections"
            element={<UserConnectionsPage />}
          />
          <Route
            path="realm/:realmId/:realmuserId/user/:id/connections"
            element={<RealmUserConnection />}
          />
          <Route path="user/:id" element={<UserPage />} />
          <Route path="user" element={<UserPage />} />
          <Route path="subaccounts" element={<Subaccounts />} />
          <Route path="subaccount/:id" element={<Subaccount />} />
          <Route path="subaccount" element={<Subaccount />} />
          <Route
            path="subaccount/:id/dashboard/:name"
            element={<SubaccountDashboard />}
          />
          <Route path="new-token/:id" element={<NewToken />} />
          <Route
            path="realm/:realmId/new-token/user/:id"
            element={<RealmUserToken />}
          />

          {/* CALCULATORS */}

          <Route
            path="view/calculator/:id/:name"
            element={<ViewCalculator />}
          />
          <Route path="calcs/all/default" element={<DefaultCalcsPage />} />
          <Route path="calcs/all/custom" element={<CustomCalcsPage />} />
          <Route
            path="calcs/all/notification"
            element={<NotificationCalcsPage />}
          />
        </Route>

        <Route path="operations">
          <Route path="dispatch" element={<DispatchResult />} />
          <Route path="case" element={<NewDispatchCase />} />
          <Route path="cases" element={<ViewNewCases />} />
          <Route path="control-usage" element={<ControlUsage />} />
          <Route path="alerts" element={<MqttAlerts />} />
        </Route>

        <Route path="reports">
          <Route path="devices/logs" element={<ScheduledDevicesLogs />} />
          <Route path="usage-control" element={<UsageControlReport />} />
          <Route path="usage-control/logs" element={<UsageControlLogs />} />
          <Route path="combined" element={<CombinedReportPage />} />
          <Route path="chart" element={<ChartReportPage />} />
          <Route path="event" element={<EventReportPage />} />
          <Route path="new-event" element={<NewEventReportsPage />} />
          <Route path="driver-behaviour" element={<DriverBehaviourReports />} />
          <Route path="route" element={<RouteReportPage />} />
          <Route path="stop" element={<StopReportPage />} />
          <Route path=":reportId" element={<CustomReport />} />
          <Route
            path="custom/devices/calc/:calcId/:calcName"
            element={<CustomCalcReports />}
          />
          <Route path="summary" element={<SummaryReportPage />} />
          <Route path="trip" element={<TripReportPage />} />
          <Route path="scheduled" element={<ScheduledPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="logs" element={<LogsPage />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default Navigation;
