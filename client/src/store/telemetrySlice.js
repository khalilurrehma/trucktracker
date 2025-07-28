import { createSlice } from "@reduxjs/toolkit";

const telemetrySlice = createSlice({
  name: "telemetry",
  initialState: {},
  reducers: {
    updateTelemetry: (state, action) => {
      const { deviceId, key, value } = action.payload;

      if (!state[deviceId]) {
        state[deviceId] = {};
      }
      state[deviceId][key] = value;
    },
  },
});
export const selectTelemetryByDeviceId = (state, deviceId) => {
  return state.telemetry[deviceId] || {};
};

export const { updateTelemetry } = telemetrySlice.actions;
export default telemetrySlice.reducer;
