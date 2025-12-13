import { Container } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AgentChat from "@/components/agent/AgentChat";

export const metadata = {
    title: "Munchy AI Agent",
    description: "Chat with Munchy AI to log foods and get nutrition help",
};

export default async function AgentPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <Container maxW="4xl" py={8} minH="100dvh">
            <AgentChat />
        </Container>
    );
}
