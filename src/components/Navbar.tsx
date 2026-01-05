import { Box, Flex, HStack, Text, Button, IconButton } from "@chakra-ui/react";
import Link from "next/link";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";
import { LuLayoutDashboard, LuBot, LuUser, LuLogOut } from "react-icons/lu";
import { logout } from "@/app/actions/auth";
import { FaChartLine } from "react-icons/fa";

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

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const user = toNavbarUser(authUser);

  const pathname = (await headers()).get("x-next-pathname") || "/";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
    { name: "Insights", href: "/insights", icon: FaChartLine },
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
              const isActive = pathname.startsWith(item.href);
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
            <form action={logout}>
              <IconButton
                as="button"
                type="submit"
                aria-label="Log out"
                variant="ghost"
                colorPalette="gray"
                size={{ base: "sm", md: "md" }}
                borderRadius="full"
                ml={{ base: 1, md: 2 }}
              >
                <LuLogOut />
              </IconButton>
            </form>
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
