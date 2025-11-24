import { createClient } from "@/utils/supabase/server";
import NavbarClient, { NavbarUser } from "./NavbarClient";

const toNavbarUser = (user: any): NavbarUser | null => {
    if (!user) return null;
    return {
        id: user.id,
        email: user.email,
        fullName: user.user_metadata?.full_name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
    };
};

export default async function Navbar() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return <NavbarClient initialUser={toNavbarUser(user)} />;
}
