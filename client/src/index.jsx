import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { CssBaseline, StyledEngineProvider } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import store from "./store";
import { LocalizationProvider } from "./common/components/LocalizationProvider";
import ErrorHandler from "./common/components/ErrorHandler";
import Navigation from "./Navigation";
import preloadImages from "./map/core/preloadImages";
import NativeInterface from "./common/components/NativeInterface";
import ServerProvider from "./ServerProvider";
import ErrorBoundary from "./ErrorBoundary";
import AppThemeProvider from "./AppThemeProvider";
import { AppContextProvider } from "./AppContext";

preloadImages();

const queryClient = new QueryClient();

const root = createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <Provider store={store}>
      <LocalizationProvider>
        <StyledEngineProvider injectFirst>
          <AppThemeProvider>
            <CssBaseline />
            <ServerProvider>
              <AppContextProvider>
                <BrowserRouter>
                  <Navigation />
                </BrowserRouter>
              </AppContextProvider>
              <ErrorHandler />
              <NativeInterface />
            </ServerProvider>
          </AppThemeProvider>
        </StyledEngineProvider>
      </LocalizationProvider>
    </Provider>
  </ErrorBoundary>
);
