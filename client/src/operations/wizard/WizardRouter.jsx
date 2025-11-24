// src/operations/wizard/WizardRouter.jsx
import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Step1CreateOperation from "./Step1CreateOperation";
import Step2QueueZone from "./Step2QueueZone";
import Step3LoadPadZone from "./Step3LoadPadZone";
import Step4DumpZone from "./Step4DumpZone";
import Step5ZoneArea from "./Step5ZoneArea";
import Step6AssignDevices from "./Step6AssignDevices";
import Step7Finalize from "./Step7Finalize";

const STEPS = [
  "create-operation",
  "zone-area",
  "load-pad",
  "dump-area",
  "queue-area",
  "assign-devices",
  "finalize",
];

export default function WizardRouter() {
  const navigate = useNavigate();

  const goNext = (currentStepKey) => {
    const idx = STEPS.indexOf(currentStepKey);
    const nextKey = STEPS[idx + 1];
    if (!nextKey) return;
    navigate(`/operations/wizard/${nextKey}`);
  };

  const goPrev = (currentStepKey) => {
    const idx = STEPS.indexOf(currentStepKey);
    const prevKey = STEPS[idx - 1];
    if (!prevKey) return;
    navigate(`/operations/wizard/${prevKey}`);
  };

  return (
    <Routes>
      <Route
        path="create-operation"
        element={<Step1CreateOperation goNext={goNext} />}
      />
      <Route
        path="queue-area"
        element={<Step2QueueZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="load-pad"
        element={<Step3LoadPadZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="dump-area"
        element={<Step4DumpZone goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="zone-area"
        element={<Step5ZoneArea goNext={goNext} goPrev={goPrev} />}
      />
      <Route
        path="assign-devices"
        element={<Step6AssignDevices goNext={goNext} goPrev={goPrev} />}
      />
      <Route path="finalize" element={<Step7Finalize goPrev={goPrev} />} />
    </Routes>
  );
}
