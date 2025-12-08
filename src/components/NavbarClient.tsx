"use client";

import { Box, Flex, Heading, Button, HStack, Portal, Menu, Avatar } from "@chakra-ui/react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export type NavbarUser = {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

const toNavbarUser = (user: User | null): NavbarUser | null => {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
  };
};

interface NavbarClientProps {
  initialUser: NavbarUser | null;
}

export default function NavbarClient({ initialUser }: NavbarClientProps) {
  const [user, setUser] = useState<NavbarUser | null>(initialUser);
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const syncUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isMounted) return;
      setUser(toNavbarUser(user));
    };

    syncUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setUser(toNavbarUser(session?.user ?? null));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Box
      as="nav"
      py={{ base: 3, md: 4 }}
      px={{ base: 4, md: 8 }}
      bg="bg.panel"
      shadow="sm"
      position="sticky"
      top="0"
      zIndex="docked"
      backdropFilter="blur(10px)"
      borderBottomWidth="1px"
      borderColor="border.muted"
    >
      <Flex
        justify="space-between"
        align="center"
        maxW={{ base: "full", lg: "7xl" }}
        mx="auto"
        gap={{ base: 2, md: 4 }}
      >
        <Link href="/">
          <Heading size={{ base: "md", md: "lg" }} color="brand.500" letterSpacing="tight">
            Munchy
          </Heading>
        </Link>

        <HStack gap={{ base: 2, md: 4 }}>
          {user ? (
            <Menu.Root positioning={{ placement: "bottom-end" }}>
              <Menu.Trigger asChild>
                <Button variant="ghost" borderRadius="full" p={0} minW="auto" size={{ base: "sm", md: "md" }}>
                  <Avatar.Root>
                    <Avatar.Fallback name={user.fullName || user.email || undefined} />
                    {user.avatarUrl && <Avatar.Image src={user.avatarUrl} />}
                  </Avatar.Root>
                </Button>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content>
                    <Menu.Item value="profile" onClick={() => router.push("/profile")}>
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
              <Button asChild variant="ghost" colorPalette="brand" size={{ base: "sm", md: "md" }}>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild colorPalette="brand" size={{ base: "sm", md: "md" }}>
                <Link href="/login?mode=signup">Get Started</Link>
              </Button>
            </>
          )}
        </HStack>
      </Flex>
    </Box>
  );
}
