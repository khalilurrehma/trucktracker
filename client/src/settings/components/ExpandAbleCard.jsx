import { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Box,
  CircularProgress,
  Collapse,
  List,
  ListItem,
} from "@mui/material";
import axios from "axios";

const ExpandableCard = ({
  title,
  count,
  countLimit,
  color,
  expection,
  apiUrl,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  let url;
  if (import.meta.env.DEV) {
    url = import.meta.env.VITE_DEV_BACKEND_URL;
  } else {
    url = import.meta.env.VITE_PROD_BACKEND_URL;
  }

  const handleExpandClick = async () => {
    setExpanded(!expanded);

    if (count !== 0) {
      if (expection === "realms") {
        setLoading(true);
        try {
          const { data } = await axios.get(`${url}/${apiUrl}`);
          if (data.status) {
            setItems(data.message);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(true);
        try {
          const { data } = await axios.get(`${url}/${apiUrl}`);
          if (data.status) {
            setItems(data.message);
          }
        } catch (error) {
          console.error("Error fetching data:", error);
        } finally {
          setLoading(false);
        }
      }
    }
  };

  return (
    <Card
      sx={{ backgroundColor: "#424242", color: "white", cursor: "pointer" }}
      onClick={handleExpandClick}
    >
      <CardContent>
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: "bold", textTransform: "uppercase" }}
        >
          {title}
        </Typography>
        <Divider sx={{ backgroundColor: "#757575", marginY: 1 }} />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          <CircularProgress
            variant="determinate"
            value={(count / countLimit) * 100}
            sx={{ color: color || "#ff9800", width: 60, height: 60 }}
          />
          <Typography variant="h6" component="div">
            {expection === "realms"
              ? items.length
                ? items.length
                : count
              : count}
          </Typography>
        </Box>
      </CardContent>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              padding: "2rem",
            }}
          >
            <CircularProgress
              sx={{ color: color || "#ff9800", width: 30, height: 30 }}
            />
          </Box>
        ) : items.length > 0 ? (
          <Box sx={{ backgroundColor: "#616161", padding: 2 }}>
            <List>
              {items.map((item) => {
                return (
                  <ListItem key={item.id}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Typography variant="body2">{item.name}</Typography>
                      <Typography variant="body2">{item.value}</Typography>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ) : (
          <Typography variant="body2">No Item was found</Typography>
        )}
      </Collapse>
    </Card>
  );
};

export default ExpandableCard;
