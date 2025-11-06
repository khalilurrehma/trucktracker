import React from "react";

export default function OperationList({ ops }) {
  const handleSelect = (id) => {
    if (ops.setSelectedOperationId) ops.setSelectedOperationId(id);
  };

  return (
    <div
      style={{
        padding: "16px",
        background: "#f5f5f5",
        borderRadius: "12px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        maxHeight: "calc(100vh - 140px)",
        overflowY: "auto",
      }}
    >
      <h3
        style={{
          fontSize: 18,
          fontWeight: "600",
          marginBottom: 12,
          color: "#263238",
          textAlign: "center",
        }}
      >
        🏗️ Operations
      </h3>

      {ops.operations.map((p) => {
        const isSelected = p.id === ops.selectedOperationId;
        return (
          <div
            key={p.id}
            onClick={() => handleSelect(p.id)}
            style={{
              background: isSelected ? "#e8f5e9" : "#ffffff",
              border: `2px solid ${isSelected ? "#00c853" : "#e0e0e0"}`,
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: 10,
              boxShadow: isSelected
                ? "0 2px 8px rgba(0,200,83,0.3)"
                : "0 1px 4px rgba(0,0,0,0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: isSelected ? "#00c853" : "#424242",
                marginBottom: 4,
              }}
            >
              {p.name}
            </div>
            <div style={{ fontSize: 12, color: "#757575" }}>ID: {p.id}</div>
            <div style={{ fontSize: 12, color: "#757575" }}>
              Priority: {p.priority}
            </div>
          </div>
        );
      })}

      {/* Responsive styles */}
      <style>
        {`
          @media (max-width: 768px) {
            div[style*="maxHeight"] {
              max-height: 300px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
