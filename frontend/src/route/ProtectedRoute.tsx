import React from "react";
import { Navigate } from "react-router-dom";
import { getAuthToken } from "../lib/authClient";

interface RouteProps {
    children: React.ReactNode;
}

// 1. Korumalı Rota (Giriş yapmamışsa /Login'e atar)
export const ProtectedRoute = ({ children }: RouteProps) => {
    const token = getAuthToken();

    if (!token) {
        return <Navigate to="/Login" replace />;
    }

    return <>{children}</>;
};

// 2. Açık / Misafir Rota (Giriş yapmışsa ana sayfaya '/' atar)
export const PublicRoute = ({ children }: RouteProps) => {
    const token = getAuthToken();

    if (token) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;