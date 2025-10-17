import { useEffect } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { useAppContext } from "../AppContext";

export default (
  keyword,
  filter,
  filterSort,
  filterMap,
  positions,
  setFilteredDevices,
  setFilteredPositions
) => {
  const groups = useSelector((state) => state.groups.items);
  const devices = useSelector((state) => state.devices.items);
  const userId = useSelector((state) => state.session.user.id);
  const { traccarUser, newAllDevices, traccarDevices } = useAppContext();

  useEffect(() => {
    const deviceGroups = (device) => {
      const groupIds = [];
      let { groupId } = device;
      while (groupId) {
        groupIds.push(groupId);
        groupId = groups[groupId]?.groupId || 0;
      }
      return groupIds;
    };

    const filtered = Object.values(userId === 1 ? traccarDevices : devices)
      .filter(
        (device) =>
          !filter.statuses.length || filter.statuses.includes(device.status)
      )
      .filter(
        (device) =>
          !filter.groups.length ||
          deviceGroups(device).some((id) => filter.groups.includes(id))
      )
      .filter((device) => {
        const lowerCaseKeyword = keyword.toLowerCase();

        return [
          device.name,
          device.uniqueId,
          device.phone,
          device.model,
          device.contact,
          device.driver_name || "",
        ].some((s) => s && s.toLowerCase().includes(lowerCaseKeyword));
      });
    switch (filterSort) {
      case "name":
        filtered.sort((device1, device2) =>
          device1.name.localeCompare(device2.name)
        );
        break;
      case "lastUpdate":
        filtered.sort((device1, device2) => {
          const time1 = device1.lastUpdate
            ? dayjs(device1.lastUpdate).valueOf()
            : 0;
          const time2 = device2.lastUpdate
            ? dayjs(device2.lastUpdate).valueOf()
            : 0;
          return time2 - time1;
        });
        break;
      default:
        break;
    }
    setFilteredDevices(filtered);
    setFilteredPositions(
      filterMap
        ? filtered.map((device) => positions[device.id]).filter(Boolean)
        : Object.values(positions)
    );
  }, [
    keyword,
    filter,
    filterSort,
    filterMap,
    groups,
    userId === 1 ? traccarDevices : devices,
    positions,
    setFilteredDevices,
    setFilteredPositions,
  ]);
};
