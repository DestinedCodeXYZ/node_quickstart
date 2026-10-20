// PAGES
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage'

// OTHER
import './styles/App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from './routes/PrivateRoute';
import { AuthProvider } from './context/AuthContext';


function App() {

  return (
    <BrowserRouter>
    <h1><b>Market Data Explorer</b></h1>
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
