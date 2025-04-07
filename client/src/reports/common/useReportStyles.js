import { makeStyles } from "@mui/styles";

export default makeStyles((theme) => ({
  container: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
  },
  containerMap: {
    flexBasis: "40%",
    flexShrink: 0,
  },
  containerMain: {
    overflow: "auto",
  },
  header: {
    position: "sticky",
    left: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
  },
  columnAction: {
    width: "1%",
    paddingLeft: theme.spacing(1),
  },
  filter: {
    display: "inline-flex",
    flexWrap: "wrap",
    gap: theme.spacing(2),
    padding: theme.spacing(3, 2, 2),
  },
  filterItem: {
    minWidth: 0,
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
  },
  filterButtons: {
    display: "flex",
    gap: theme.spacing(1),
    flex: `1 1 ${theme.dimensions.filterFormWidth}`,
  },
  filterButton: {
    flexGrow: 1,
  },
  chart: {
    flexGrow: 1,
    overflow: "hidden",
  },
  mainDiv: {
    width: "100%",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  subDiv: {
    minHeight: "50px",
    minWidth: "100px",
    flexGrow: "1",
    margin: "5px",
    display: "flex",
    flexDirection: "row",
  },
  subDivnoGrow: {
    minHeight: "50px",
    // minWidth: "100px",
    // flexGrow: "1",
    margin: "5px",
    display: "flex",
    flexDirection: "row",
  },
  fab: {
    position: "fixed",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    bottom: theme.spacing(2),
    right: theme.spacing(2),
    [theme.breakpoints.down("md")]: {
      bottom: `calc(${theme.dimensions.bottomBarHeight}px + ${theme.spacing(
        2
      )})`,
    },
  },
}));
