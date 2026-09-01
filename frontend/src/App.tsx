import { router } from './route/route.tsx'
import { RouterProvider } from 'react-router-dom'
import { usePresence } from "./hooks/usePrefesences";
import { useChatStore } from "./store/useChatStore"; // projendeki gerçek yol neyse

function App() {
  const { currentUser } = useChatStore() as any; // currentUser'ı nereden alıyorsan oradan

  usePresence(currentUser?.id);
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App
