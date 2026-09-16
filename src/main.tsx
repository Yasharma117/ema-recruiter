import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/index.css';
import { StoreProvider } from './store';
import { SearchRoute, CandidatesRoute, OutreachRoute } from './layouts';
import { MessagesScreen } from './screens/Messages';
import { DocScreen } from './screens/Doc';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <StoreProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/candidates" replace />} />
          <Route path="/search" element={<SearchRoute />} />
          <Route path="/candidates" element={<CandidatesRoute />} />
          <Route path="/outreach" element={<OutreachRoute />} />
          <Route path="/messages" element={<MessagesScreen />} />
          <Route path="/docs/:file" element={<DocScreen />} />
          <Route path="*" element={<Navigate to="/candidates" replace />} />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
