// src/operations/editWizard/EditWizardRouter.jsx
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import EditStep1Operation from "./EditStep1Operation";
import EditStep2QueueZone from "./EditStep2QueueZone";
import EditStep3LoadPadZone from "./EditStep3LoadPadZone";
import EditStep4DumpZone from "./EditStep4DumpZone";
import EditStep5ZoneArea from "./EditStep5ZoneArea";
import EditStep6Devices from "./EditStep6Devices";
import EditStep7Finalize from "./EditStep7Finalize";

const STEPS = [
  "operation",
  "zone-area",
  "load-pad",
  "dump",
  "queue",
  "devices",
  "finalize",
];

export default function EditWizardRouter() {
  const navigate = useNavigate();

  const goNext = (currentKey) => {
    const idx = STEPS.indexOf(currentKey);
    const nextKey = STEPS[idx + 1];
    if (!nextKey) return;
    navigate(nextKey);
  };

  const goPrev = (currentKey) => {
    const idx = STEPS.indexOf(currentKey);
    const prevKey = STEPS[idx - 1];
    if (!prevKey) return;
    navigate(prevKey);
  };

  return (
    <Routes>
      <Route
        path="operation"
        element={<EditStep1Operation goNext={goNext} />}
      />
      <Route
        path="zone-area"
        element={<EditStep5ZoneArea goNext={goNext} goPrev={goPrev} />}
      />

      <Route
        path="load-pad"
        element={<EditStep3LoadPadZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="dump"
        element={<EditStep4DumpZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="queue"
        element={<EditStep2QueueZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="devices"
        element={<EditStep6Devices goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="finalize"
        element={<EditStep7Finalize goPrev={goPrev} />}
      />
    </Routes>
  );
}
