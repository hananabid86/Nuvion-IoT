
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { AppStateProvider } from '@/hooks/use-app-state';
import { SearchProvider } from '@/hooks/use-search';
import { AuthGuard } from '@/components/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppStateProvider>
        <SearchProvider>
          <div className="relative flex min-h-screen bg-background">
              {/* Animated background */}
              <div className="absolute top-0 left-0 -z-10 h-full w-full bg-muted/20">
                <div className="absolute bottom-auto left-auto right-0 top-0 h-[500px] w-[500px] -translate-x-[20%] translate-y-[20%] rounded-full bg-primary/20 opacity-50 blur-[120px]"></div>
              </div>
              <Sidebar />
              <div id="content" className="flex-1 flex flex-col transition-all duration-300 ease-in-out ml-0 md:ml-[var(--sidebar-width-expanded)]">
                  <Header />
                  <main className="flex-1 p-4 sm:p-6 lg:p-8">
                      {children}
                  </main>
              </div>
          </div>
        </SearchProvider>
      </AppStateProvider>
    </AuthGuard>
  );
}
