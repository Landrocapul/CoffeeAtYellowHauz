import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RootLayout } from './ui/RootLayout'
import { LoginPage } from './views/LoginPage'
import { PosPage } from './views/PosPage'
import { ProductsPage } from './views/ProductsPage'
import { ReportsPage } from './views/ReportsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Navigate to="/pos" replace /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'pos', element: <PosPage /> },
      { path: 'products', element: <ProductsPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },
])
