import {UploadCard} from "./UploadCard";

import {Stack} from "@mantine/core";
import {AuthPage} from "./AuthPage";
import {Route, Routes} from "react-router-dom";

function App() {
    return (
        <Routes>
            <Route path="/" element={<Stack align='center' justify='center' h='100vh'>
                <UploadCard/>
            </Stack>}/>
            <Route path="/auth" element={<AuthPage/>}/>
        </Routes>
    )
}

export default App
