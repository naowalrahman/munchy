'use client'

import { Box, Flex, Heading, Button, HStack, Portal } from '@chakra-ui/react'
import { Menu } from '@chakra-ui/react'
import { Avatar } from '@chakra-ui/react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function Navbar() {
    const [user, setUser] = useState<User | null>(null)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/')
        router.refresh()
    }

    return (
        <Box as="nav" py={4} px={8} bg="bg.panel" shadow="sm">
            <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
                <Link href="/">
                    <Heading size="lg" color="brand.500" letterSpacing="tight">
                        Munchy
                    </Heading>
                </Link>

                <HStack gap={4}>
                    {user ? (
                        <Menu.Root positioning={{ placement: "bottom-end" }}>
                            <Menu.Trigger asChild>
                                <Button variant="ghost" borderRadius="full" p={0} minW="auto">
                                    <Avatar.Root>
                                        <Avatar.Fallback name={user.user_metadata.full_name || user.email} />
                                        <Avatar.Image src={user.user_metadata.avatar_url} />
                                    </Avatar.Root>
                                </Button>
                            </Menu.Trigger>
                            <Portal>
                                <Menu.Positioner>
                                    <Menu.Content>
                                        <Menu.Item value="profile" onClick={() => router.push('/profile')}>
                                            Profile Settings
                                        </Menu.Item>
                                        <Menu.Item value="logout" onClick={handleLogout}>
                                            Log Out
                                        </Menu.Item>
                                    </Menu.Content>
                                </Menu.Positioner>
                            </Portal>
                        </Menu.Root>
                    ) : (
                        <>
                            <Button asChild variant="ghost" colorPalette="brand">
                                <Link href="/login">Log In</Link>
                            </Button>
                            <Button asChild colorPalette="brand">
                                <Link href="/login?mode=signup">Get Started</Link>
                            </Button>
                        </>
                    )}
                </HStack>
            </Flex>
        </Box>
    )
}
