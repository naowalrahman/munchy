import { Container } from "@chakra-ui/react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import AgentChat from "@/components/agent/AgentChat";
import { ApiKeyMissing } from "@/components/agent/ApiKeyMissing";

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

  const hasApiKey = Boolean(user.user_metadata?.groq_api_key);

  return (
    <Container maxW="4xl" py={4} h="full" overflow="hidden">
      {hasApiKey ? <AgentChat /> : <ApiKeyMissing />}
    </Container>
  );
}
