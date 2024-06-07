import {Button, Center, Divider, Group, Paper, rem, Stack, Text, Title} from '@mantine/core'
import {Dropzone, FileRejection} from '@mantine/dropzone'
import {IconFile3d, IconUpload, IconX} from '@tabler/icons-react'
import {useEffect, useState} from 'react'
import {useCreateStreamMutation} from '../queries'
import {useAuth} from "../AuthProvider";
import {useNavigate} from "react-router-dom";
import {processFile} from "../Speckle/processFile.ts";

interface FileError {
    code: string
    message: string
    file: string
}

export const UploadCard = () => {
    const {token, login} = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!token) {
            login()
        }
    }, [token, navigate, login])

    const [file, setFile] = useState<File | null>(null)
    const [errors, setErrors] = useState<FileError[] | null>(null)
    const [loading, setLoading] = useState(false)
    const [createStream, {error: graphqlError}] = useCreateStreamMutation()

    const handleClick = async () => {
        if (!file) return
        setLoading(true)
        const {data} = await createStream({variables: {stream: {name: file.name.replace('.xml', '')}}})
        await processFile({
            file: file as File,
            streamId: data!.streamCreate as string,
            token: token!,
            branchName: 'main',
            message: null,
        })
        setLoading(false)
        setFile(null)
    }
    const handleReject = (fileRejections: FileRejection[]) => {
        setErrors(fileRejections.map((rejection) => ({...rejection.errors[0], file: rejection.file.name})))
    }

    const handleDrop = (acceptedFiles: File[]) => {
        setErrors([])
        setFile(acceptedFiles[0])
    }

    const fileValidator = (file: File) => {
        const validExtension = file.name.endsWith('.xml')
        if (!validExtension) {
            return {
                code: 'file-invalid-type',
                message: 'Invalid file type. Only .xml files are allowed.',
            }
        }
        return null
    }

    return (
        <Paper bg='green' p='lg'>
            <Stack>
                <Center>
                    <Title order={2}>Upload File</Title>
                </Center>
                <Divider py={8}/>
                <Dropzone
                    onDrop={handleDrop}
                    onReject={handleReject}
                    maxSize={50 * 1024 ** 2}
                    multiple={false}
                    validator={fileValidator}
                >
                    <Group justify='center' gap='xl' mih={220} style={{pointerEvents: 'none'}}>
                        <Dropzone.Accept>
                            <IconUpload
                                style={{width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)'}}
                                stroke={1.5}
                            />
                        </Dropzone.Accept>
                        <Dropzone.Reject>
                            <IconX style={{width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)'}}
                                   stroke={1.5}/>
                        </Dropzone.Reject>
                        <Dropzone.Idle>
                            <IconFile3d
                                style={{width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)'}}
                                stroke={1.5}
                            />
                        </Dropzone.Idle>

                        <div>
                            <Text size='xl' inline>
                                Drag XML files here or click to select files
                            </Text>
                            <Text size='sm' c='dimmed' inline mt={7}>
                                Attach as many files as you like, each file should not exceed 50Mb
                            </Text>
                        </div>
                    </Group>
                    <div>
                        {file ? (
                            <Group>
                                <IconFile3d stroke={0.7}/>
                                <Text size='sm'>{file.name}</Text>
                            </Group>
                        ) : null}
                    </div>
                    {errors ? (
                        <div>
                            {errors.map((error) => (
                                <Text size='sm' c='red'>
                                    File: {error.file} - {error.message}
                                </Text>
                            ))}
                        </div>
                    ) : null}
                    {graphqlError ? (
                        <Text size='sm' c='red'>
                            GraphQL Error: {graphqlError.message}
                        </Text>
                    ) : null}
                </Dropzone>
                <Button mt='md' onClick={handleClick} loading={loading} disabled={!file}>
                    Upload
                </Button>
            </Stack>
        </Paper>
    )
}
