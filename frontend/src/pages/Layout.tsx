import { Outlet } from "react-router-dom";
import Sidebar from "../components/sideBar";
import { usePushRegistration } from "../hooks/usePushRegistration";

const Layout = () => {
    usePushRegistration();
    return (
        <div className="flex h-screen w-screen bg-[#111b21] overflow-hidden">
            <Sidebar />
            <main className="flex-1 h-full overflow-hidden flex flex-col">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;