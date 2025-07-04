import React, { useRef, useState, useEffect } from "react";
import {
  Table,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableBody,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Box,
} from "@mui/material";
import { styled, useTheme, alpha } from "@mui/material/styles";
import { TableVirtuoso } from "react-virtuoso"; // Make sure you have this installed

const MessagesTable = ({ messages, player }) => {
  const theme = useTheme();
  const virtuoso = useRef(null);

  const allFields = [
    "ain.1",
    "ain.2",
    "alarm.code",
    "arm.status",
    "battery.voltage",
    "can.engine.ignition.status",
    "can.fuel.consumed",
    "can.vehicle.mileage",
    "channel.id",
    "device.id",
    "device.name",
    "device.type.id",
    "din",
    "dout",
    "event.enum",
    "external.powersource.status",
    "external.powersource.voltage",
    "fuel.flow.meter.fuel.consumed",
    "gnss.antenna.status",
    "gsm.cellid",
    "gsm.lac",
    "gsm.mcc",
    "gsm.mnc",
    "gsm.signal.dbm",
    "ibutton.authorized.status",
    "ident",
    "movement.status",
    "peer",
    "position.altitude",
    "position.direction",
    "position.hdop",
    "position.latitude",
    "position.longitude",
    "position.satellites",
    "position.speed",
    "position.valid",
    "protocol.id",
    "protocol.version",
    "rfid.code",
    "server.timestamp",
    "server1.connection.status",
    "server2.connection.status",
    "timestamp",
    "vehicle.mileage",
  ];

  const [selectedFields, setSelectedFields] = useState([
    "timestamp",
    "server.timestamp",
    "ident",
    "position.latitude",
    "position.longitude",
    "position.altitude",
    "position.speed",
  ]);
  const [highlightedIndex, setHighlightedIndex] = useState(null);

  useEffect(() => {
    if (player && player.value != null) {
      setHighlightedIndex(player.value);
    }
  }, [player?.value]);

  // Auto-scroll to highlighted message
  useEffect(() => {
    if (
      highlightedIndex !== null &&
      virtuoso.current &&
      typeof virtuoso.current.scrollToIndex === "function"
    ) {
      virtuoso.current.scrollToIndex({
        index: highlightedIndex,
        align: "center",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex, messages]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";
    const date = new Date(timestamp * 1000);
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
  };

  const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${TableCell.head}`]: {
      backgroundColor: theme.palette.common.black,
      color: theme.palette.common.white,
      padding: "5px 5px",
    },
    [`&.${TableCell.body}`]: {
      padding: "0px 5px",
    },
  }));

  const etcFields = allFields.filter(
    (field) => !selectedFields.includes(field)
  );

  const renderEtcField = (message) => (
    <StyledTableCell>
      {etcFields.map((field) => {
        if (message[field] !== undefined) {
          return (
            <Typography
              key={field}
              sx={{
                whiteSpace: "nowrap",
                display: "inline",
                fontSize: "12px",
              }}
            >{`${field}: ${message[field]}; `}</Typography>
          );
        }
        return null;
      })}
    </StyledTableCell>
  );

  // Virtuoso MUI table mapping (unchanged)
  const VirtuosoTableComponents = {
    Scroller: React.forwardRef((props, ref) => (
      <TableContainer
        component={Paper}
        {...props}
        ref={ref}
        id="tableContainer"
      />
    )),
    Table: (props) => <Table {...props} />,
    TableHead,
    TableRow: ({ item: _item, ...props }) => <TableRow {...props} />,
    TableBody: React.forwardRef((props, ref) => (
      <TableBody {...props} ref={ref} />
    )),
  };

  const fixedHeaderContent = () => (
    <TableRow>
      {selectedFields.map((field) => (
        <StyledTableCell key={field}>{field}</StyledTableCell>
      ))}
      <StyledTableCell>etc</StyledTableCell>
    </TableRow>
  );

  const rowContent = (index, message) => (
    <>
      {selectedFields.map((field) => (
        <StyledTableCell
          key={field}
          sx={{
            whiteSpace: "nowrap",
            fontSize: "12px",
            backgroundColor:
              index === highlightedIndex
                ? alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === "dark" ? 0.3 : 0.12
                  )
                : "inherit",
            color:
              index === highlightedIndex
                ? theme.palette.getContrastText(theme.palette.primary.main)
                : "inherit",
            transition: "background 0.2s",
          }}
        >
          {field === "timestamp" || field === "server.timestamp"
            ? formatDate(message[field])
            : message[field] !== undefined
            ? message[field]
            : "-"}
        </StyledTableCell>
      ))}
      {renderEtcField(message)}
    </>
  );

  const handleMoveToCurrent = () => {
    if (
      virtuoso.current &&
      typeof virtuoso.current.scrollToIndex === "function" &&
      highlightedIndex != null
    ) {
      virtuoso.current.scrollToIndex({
        index: highlightedIndex,
        align: "center",
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      <Tooltip title="Move To Current Message" placement="top">
        <span>
          <IconButton
            sx={{ fontSize: "12px" }}
            onClick={() => {
              if (
                virtuoso.current &&
                typeof virtuoso.current.scrollToIndex === "function"
              ) {
                virtuoso.current.scrollToIndex({
                  index: highlightedIndex,
                  align: "center",
                  behavior: "smooth",
                });
              }
              return false;
            }}
          >
            MOT
          </IconButton>
        </span>
      </Tooltip>
      <Paper style={{ height: "200px", width: "100%" }}>
        {messages.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography>No messages</Typography>
          </Box>
        ) : (
          <TableVirtuoso
            data={messages}
            // components={VirtuosoTableComponents}
            fixedHeaderContent={fixedHeaderContent}
            itemContent={rowContent}
            ref={virtuoso}
          />
        )}
      </Paper>
    </>
  );
};

export default MessagesTable;
