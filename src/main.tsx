import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import {AuthProvider} from "./AuthProvider";
import {GraphQlProvider} from "./GraphQlProvider";
import {MantineProvider} from "@mantine/core";
import {BrowserRouter} from 'react-router-dom';
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider>
            <BrowserRouter>
                <GraphQlProvider>
                    <MantineProvider>
                        <App/>
                    </MantineProvider>
                </GraphQlProvider>
            </BrowserRouter>
        </AuthProvider>
    </React.StrictMode>,
)
