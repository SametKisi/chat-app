import { createBrowserRouter } from "react-router-dom";
import Layout from "../pages/Layout.tsx";
import MessagePage from "../pages/MessagePage.tsx";
import LoginPage from "../pages/LoginPage.tsx";
import RegisterPage from "../pages/RegisterPage.tsx";
import { ProtectedRoute, PublicRoute } from "./ProtectedRoute.tsx";

export const router = createBrowserRouter([
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <Layout />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <MessagePage />
            }
        ]
    },
    {
        path: '/Login',
        element: (
            <PublicRoute>
                <LoginPage />
            </PublicRoute>
        )
    },
    {
        path: '/Register',
        element: (
            <PublicRoute>
                <RegisterPage />
            </PublicRoute>
        )
    }
]);