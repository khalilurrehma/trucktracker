import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { FixedSizeList } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { devicesActions } from "../store";
import { useEffectAsync } from "../reactHelper";
import DeviceRow from "./DeviceRow";
import { fetchDriverByTraccarDeviceId } from "../apis/api";
const useStyles = makeStyles((theme) => ({
  list: {
    maxHeight: "100%",
  },
  listInner: {
    position: "relative",
    margin: theme.spacing(1.5, 0),
  },
}));

const DeviceList = ({ devices }) => {
  const classes = useStyles();
  const dispatch = useDispatch();
  const listInnerEl = useRef(null);

  if (listInnerEl.current) {
    listInnerEl.current.className = classes.listInner;
  }

  const [, setTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setTime(Date.now()), 60000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffectAsync(async () => {
    const response = await fetch("/api/devices");
    if (response.ok) {
      let devices = await response.json();

      // enrich missing drivers
      const enriched = await Promise.all(
        devices.map(async (d) => {
          if (!d.driver_name) {
            try {
              const driver = await fetchDriverByTraccarDeviceId(d.id);
              return { ...d, driver_name: driver?.name || "" };
            } catch {
              return { ...d, driver_name: "" };
            }
          }
          return d;
        })
      );

      dispatch(devicesActions.refresh(enriched));
    } else {
      throw Error(await response.text());
    }
  }, []);

  return (
    <AutoSizer className={classes.list}>
      {({ height, width }) => (
        <FixedSizeList
          width={width}
          height={height}
          itemCount={devices.length}
          itemData={devices}
          itemSize={72}
          overscanCount={10}
          innerRef={listInnerEl}
        >
          {DeviceRow}
        </FixedSizeList>
      )}
    </AutoSizer>
  );
};

export default DeviceList;
