"use client";

import { Box, Flex, HStack, Text, Button, IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { LuLayoutDashboard, LuBot, LuUser, LuLogOut } from "react-icons/lu";

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
  const pathname = usePathname();

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

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
    { name: "Agent", href: "/agent", icon: LuBot },
    { name: "Profile", href: "/profile", icon: LuUser },
  ];

  return (
    <Box
      as="nav"
      position="sticky"
      top={0}
      zIndex="docked"
      bg="bg.panel"
      borderBottomWidth="1px"
      borderColor="border.muted"
      backdropFilter="blur(10px)"
      py={{ base: 2, md: 3 }}
    >
      <Flex justify="space-between" align="center" maxW="7xl" mx="auto" px={{ base: 4, md: 8 }}>
        <Link href="/">
          <Text fontWeight="bold" fontSize={{ base: "lg", md: "xl" }} color="brand.500" letterSpacing="tight">
            Munchy
          </Text>
        </Link>

        {user ? (
          <HStack gap={{ base: 1, md: 2 }}>
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Button
                  key={item.name}
                  asChild
                  variant="ghost"
                  size={{ base: "sm", md: "md" }}
                  colorPalette={isActive ? "brand" : "gray"}
                  bg={isActive ? "brand.subtle" : undefined}
                  borderRadius="full"
                  px={{ base: 3, md: 4 }}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <Text display={{ base: "none", sm: "inline" }}>{item.name}</Text>
                  </Link>
                </Button>
              );
            })}
            <IconButton
              aria-label="Log out"
              onClick={handleLogout}
              variant="ghost"
              colorPalette="gray"
              size={{ base: "sm", md: "md" }}
              borderRadius="full"
              ml={{ base: 1, md: 2 }}
            >
              <LuLogOut />
            </IconButton>
          </HStack>
        ) : (
          <HStack gap={{ base: 2, md: 4 }}>
            <Button asChild variant="ghost" colorPalette="brand" size={{ base: "sm", md: "md" }}>
              <Link href="/login">Log In</Link>
            </Button>
            <Button asChild colorPalette="brand" size={{ base: "sm", md: "md" }}>
              <Link href="/login?mode=signup">Get Started</Link>
            </Button>
          </HStack>
        )}
      </Flex>
    </Box>
  );
}
