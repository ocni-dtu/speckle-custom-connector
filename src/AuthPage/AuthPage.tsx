import {useEffect} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {Container} from '@mantine/core'
import {useAuth} from "../AuthProvider";

export const AuthPage = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const {exchangeAccessCode} = useAuth()

    useEffect(() => {
        if (searchParams.has('access_code')) {
            const accessCode = searchParams.get('access_code')!
            setSearchParams({})
            exchangeAccessCode(accessCode).then(() => {
                navigate('/')
            })
        }
    }, [searchParams, exchangeAccessCode, setSearchParams, navigate])

    return (
        <Container>
            Loading...
        </Container>
    )
}
