import './styles/App.css'
import { Route, Routes, BrowserRouter } from 'react-router-dom';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPage from './pages/RegisterPage';
import PrivateRoute from './routes/PrivateRoute';
import { AppProviders } from './components/AppProvider';

function App() {

  return (
    <BrowserRouter>
      <AppProviders>
        <Routes>
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route element={<PrivateRoute />}>
                    <Route path="/candles" element={<DashboardPage />} />
                </Route>
              </Routes>
      </AppProviders>
      
    </BrowserRouter>
  )
}

export default App
