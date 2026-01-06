import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTheme } from "@mui/material/styles";

const NotFound = () => {
  const location = useLocation();
  const theme = useTheme();
  const dataTheme = theme?.palette?.mode === "dark" ? "dark" : "light";

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      className="ops-theme flex min-h-screen items-center justify-center bg-muted"
      data-theme={dataTheme}
    >
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
