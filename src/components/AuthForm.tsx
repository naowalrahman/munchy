'use client'

import { useState } from 'react'
import { Box, Button, Input, VStack, Heading, Text, Stack } from '@chakra-ui/react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthForm() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const searchParams = useSearchParams()
    const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
    const supabase = createClient()

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (mode === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: name,
                        },
                    },
                })
                if (error) throw error
                alert('Check your email for the confirmation link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                })
                if (error) throw error
                router.push('/dashboard')
                router.refresh()
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Box w="full" maxW="md" p={8} borderRadius="xl" bg="bg.panel" shadow="lg" borderWidth="1px" borderColor="border.muted">
            <VStack gap={6} as="form" onSubmit={handleAuth}>
                <Heading size="xl" textAlign="center">
                    {mode === 'signup' ? 'Create an Account' : 'Welcome Back'}
                </Heading>

                <Stack gap={4} w="full">
                    {mode === 'signup' && (
                        <Box>
                            <Text mb={2} fontWeight="medium">Name</Text>
                            <Input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Your Name"
                                required
                            />
                        </Box>
                    )}

                    <Box>
                        <Text mb={2} fontWeight="medium">Email</Text>
                        <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </Box>

                    <Box>
                        <Text mb={2} fontWeight="medium">Password</Text>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </Box>
                </Stack>

                {error && (
                    <Text color="red.500" fontSize="sm">
                        {error}
                    </Text>
                )}

                <Button type="submit" colorPalette="brand" w="full" loading={loading}>
                    {mode === 'signup' ? 'Sign Up' : 'Log In'}
                </Button>

                <Text fontSize="sm" color="text.muted">
                    {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <Button
                        variant="ghost"
                        colorPalette="brand"
                        size="sm"
                        onClick={() => router.push(mode === 'signup' ? '/login' : '/login?mode=signup')}
                    >
                        {mode === 'signup' ? 'Log In' : 'Sign Up'}
                    </Button>
                </Text>
            </VStack>
        </Box>
    )
}
