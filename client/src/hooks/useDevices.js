import { useEffect, useState } from "react";
import { getFlespiDevices, getFlespiDevicesByUserId } from "../apis/api";
import { useSelector } from "react-redux";

export function useDevices(selectedOperationId) {
  const [allDevices, setAllDevices] = useState([]);
  const userId = useSelector((s) => s.session.user.id);

  useEffect(() => {
    (async () => {
      const response = userId === 1 ? await getFlespiDevices() : await getFlespiDevicesByUserId(userId);
      const free = response?.data?.filter((device) => device.shift_assigned === 0) || [];
      setAllDevices(free);
    })();
  }, [userId, selectedOperationId]);

  return allDevices;
}
