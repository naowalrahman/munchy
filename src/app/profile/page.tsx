'use client'

import { useState, useEffect } from 'react'
import { Box, Button, Input, VStack, Heading, Text, Stack, Container } from '@chakra-ui/react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'

export default function ProfilePage() {
    const [user, setUser] = useState<User | null>(null)
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser()
            if (error || !user) {
                router.push('/login')
                return
            }
            setUser(user)
            setName(user.user_metadata.full_name || '')
        }
        getUser()
    }, [router])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage(null)
        setError(null)

        try {
            const updates: any = {
                data: { full_name: name }
            }

            if (password) {
                updates.password = password
            }

            const { error } = await supabase.auth.updateUser(updates)

            if (error) throw error
            setMessage('Profile updated successfully!')
            setPassword('') // clear password field

            // Refresh user data to update navbar
            router.refresh()
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (!user) return null

    return (
        <Box minH="100vh" bg="bg.canvas">
            <Container maxW="md" py={12}>
                <Box p={8} borderRadius="xl" bg="bg.panel" shadow="lg" borderWidth="1px" borderColor="border.muted">
                    <VStack gap={6} as="form" onSubmit={handleUpdateProfile}>
                        <Heading size="xl" textAlign="center">
                            Profile Settings
                        </Heading>

                        <Stack gap={4} w="full">
                            <Box>
                                <Text mb={2} fontWeight="medium">Email</Text>
                                <Input
                                    value={user.email}
                                    readOnly
                                    disabled
                                    color="text.muted"
                                />
                            </Box>

                            <Box>
                                <Text mb={2} fontWeight="medium">Name</Text>
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your Name"
                                />
                            </Box>

                            <Box>
                                <Text mb={2} fontWeight="medium">New Password</Text>
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank to keep current"
                                />
                            </Box>
                        </Stack>

                        {message && (
                            <Text color="green.500" fontSize="sm">
                                {message}
                            </Text>
                        )}

                        {error && (
                            <Text color="red.500" fontSize="sm">
                                {error}
                            </Text>
                        )}

                        <Button type="submit" colorPalette="brand" w="full" loading={loading}>
                            Update Profile
                        </Button>
                    </VStack>
                </Box>
            </Container>
        </Box>
    )
}
