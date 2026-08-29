import {router} from './route/route.tsx'
import { RouterProvider } from 'react-router-dom'

function App() {

  return (
    <>
      <RouterProvider router={router}/>
    </>
  )
}

export default App
