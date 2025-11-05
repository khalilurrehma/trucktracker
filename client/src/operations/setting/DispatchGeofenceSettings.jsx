import React, { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Grid,
    Autocomplete,
    TextField,
    Chip,
    CircularProgress,
} from "@mui/material";
import OperationsMenu from "../../settings/components/OperationsMenu";
import PageLayout from "../../common/components/PageLayout";
import axios from "axios";
import {
    Package, TrendingUp, TrendingDown, Clock, Zap, Fuel, Truck, Users,
    Activity, Target, AlertCircle
} from "lucide-react";
const DispatchResult = () => {

    return (
        <PageLayout
            menu={<OperationsMenu />}
            breadcrumbs={["Operations", "reportDispatchResult"]}
        >
            <div className="min-h-screen bg-background p-6 fade-in">
                <div className="max-w-[1800px] mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-foreground mb-2">
                                Device Setting
                            </h1>
                           
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success/10 border border-success/20">
                            <Activity className="w-5 h-5 text-success animate-pulse" />
                            <span className="text-sm font-medium text-success">Live</span>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    );
};

export default DispatchResult;
