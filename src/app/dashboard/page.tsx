import { createClient } from "@/utils/supabase/server";
import { Box, Container, Heading, Text, Button, VStack } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { signOut } from "./actions";

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }

    return (
        <Box minH="100vh" bg="bg.canvas" p={8}>
            <Container maxW="7xl">
                <VStack align="start" gap={6}>
                    <Heading>Dashboard</Heading>
                    <Text>Welcome, {user.email}!</Text>
                    <Text color="text.muted">This is your temporary empty dashboard.</Text>

                    <form action={signOut}>
                        <Button type="submit" colorPalette="red" variant="outline">
                            Sign Out
                        </Button>
                    </form>
                </VStack>
            </Container>
        </Box>
    );
}
