import './App.css'
import { Route, Routes, BrowserRouter } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './routes/PrivateRoute';
import { AuthProvider } from './context/AuthContext';

function App() {

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<PrivateRoute />}>
            <Route path="/candles" element={<DashboardPage />} />

          </Route>
        </Routes>
      </AuthProvider>
      
    </BrowserRouter>
  )
}

export default App
