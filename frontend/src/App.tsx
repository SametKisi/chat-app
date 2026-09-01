import { router } from './route/route.tsx'
import { RouterProvider } from 'react-router-dom'
import { usePresence } from "./hooks/usePrefesences";
import { authClient } from "./lib/authClient.ts"; // projendeki gerçek dosya yolu neyse

function App() {
  const sessionResult = authClient.useSession();
  const userId = (sessionResult?.data as any)?.user?.id;

  usePresence(userId);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}