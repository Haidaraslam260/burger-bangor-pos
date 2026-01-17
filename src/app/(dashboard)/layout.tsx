import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar, Header } from "@/components/layout";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session?.user) {
        redirect("/login");
    }

    return (
        <div className="min-h-screen bg-muted/30">
            <Sidebar userRole={session.user.role} />
            <div className="lg:pl-64">
                <Header user={session.user} />
                <main className="p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
