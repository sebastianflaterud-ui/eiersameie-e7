import {
  LayoutDashboard,
  List,
  Upload,
  Sparkles,
  Home,
  Building,
  CreditCard,
  FileText,
  Settings,
  Wallet,
  MessageSquare,
  LogOut,
  Users,
  Handshake,
  Hammer,
  DoorOpen,
  CalendarDays,
  FileSignature,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const eiendomItems = [
  { title: 'Enheter', url: '/enheter', icon: DoorOpen },
  { title: 'Leietakere', url: '/leietakere', icon: Users },
  { title: 'Kontrakter', url: '/kontrakter', icon: FileSignature },
  { title: 'Kalender', url: '/kalender', icon: CalendarDays },
];

const utleieItems = [
  { title: 'Leieinntekter', url: '/leieinntekter', icon: Home },
  { title: 'Eiersameie', url: '/eiersameie', icon: Building },
  { title: 'Mellomværende', url: '/mellomvaerende', icon: Handshake },
  { title: 'Investeringer', url: '/investeringer', icon: Hammer },
  { title: 'Skattemeldingsgrunnlag', url: '/skatt', icon: FileText },
];

const privatItems = [
  { title: 'Abonnementer', url: '/abonnementer', icon: CreditCard },
];

const importItems = [
  { title: 'Transaksjoner', url: '/transaksjoner', icon: List },
  { title: 'Import', url: '/import', icon: Upload },
  { title: 'Datavasking', url: '/datavasking', icon: Sparkles },
];

const innstillingerItems = [
  { title: 'Regler', url: '/regler', icon: Settings },
  { title: 'Kontoer', url: '/kontoer', icon: Wallet },
  { title: 'Chat', url: '/chat', icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { signOut } = useAuth();

  const renderItems = (items: { title: string; url: string; icon: any }[]) =>
    items.map((item) => (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === '/'}
            className="hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="px-4 py-4">
          {!collapsed && (
            <h1 className="text-lg font-bold text-sidebar-foreground">
              Transaksjonsbanken
            </h1>
          )}
        </div>

        {/* Dashboard */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderItems([{ title: 'Dashboard', url: '/', icon: LayoutDashboard }])}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Eiendom */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Eiendom</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(eiendomItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Utleie */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Utleie</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(utleieItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Privatøkonomi */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Privatøkonomi</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(privatItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Import og data */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Import og data</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(importItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Innstillinger */}
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Innstillinger</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(innstillingerItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-2">Logg ut</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
