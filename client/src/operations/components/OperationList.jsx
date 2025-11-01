import React from "react";

export default function OperationList({ ops }) {
  return (
    <div className="card">
      <h4>Operations</h4>
      {ops.operations.map((p) => (
        <div key={p.id} style={{ fontSize: 13, marginBottom: 6 }}>
          <span
            onClick={() => ops.setSelectedOperationId(p.id)}
            style={{
              cursor: "pointer",
              fontWeight: p.id === ops.selectedOperationId ? 700 : 400,
              color: p.id === ops.selectedOperationId ? "#00e676" : "inherit",
            }}
          >
            {p.name}
          </span>
          <button className="btn-small" onClick={() => ops.deleteOperation(p.id)}>
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
