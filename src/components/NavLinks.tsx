"use client";

import { usePathname } from "next/navigation";
import { HStack, Text, Button } from "@chakra-ui/react";
import Link from "next/link";
import { LuLayoutDashboard, LuBot, LuUser, LuChartColumn } from "react-icons/lu";
import { IconType } from "react-icons";

type NavItem = {
  name: string;
  href: string;
  icon: IconType;
};

const navItems: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LuLayoutDashboard },
  { name: "Insights", href: "/insights", icon: LuChartColumn },
  { name: "Agent", href: "/agent", icon: LuBot },
  { name: "Profile", href: "/profile", icon: LuUser },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
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
    </HStack>
  );
}
