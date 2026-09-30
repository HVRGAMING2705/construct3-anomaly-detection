import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import AnomalyDetector from './pages/AnomalyDetector'
import TrainStudio from './pages/TrainStudio'
import ThresholdPlayground from './pages/ThresholdPlayground'
import LatentExplorer from './pages/LatentExplorer'
import Denoiser from './pages/Denoiser'
import Experiments from './pages/Experiments'
import Research from './pages/Research'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/detect" element={<AnomalyDetector />} />
        <Route path="/train" element={<TrainStudio />} />
        <Route path="/threshold" element={<ThresholdPlayground />} />
        <Route path="/latent" element={<LatentExplorer />} />
        <Route path="/denoise" element={<Denoiser />} />
        <Route path="/experiments" element={<Experiments />} />
        <Route path="/research" element={<Research />} />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  )
}