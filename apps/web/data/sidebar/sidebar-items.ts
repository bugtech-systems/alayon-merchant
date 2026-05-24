import {
  Banknote,
  Calendar,
  ChartBar,
  Fingerprint,
  Forklift,
  Gauge,
  GraduationCap,
  Kanban,
  LayoutDashboard,
  ListTodo,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  ReceiptText,
  ShoppingBag,
  SquareArrowUpRight,
  Users,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Home",
        url: "/dashboard/default-v1",
        icon: LayoutDashboard,
      },
      {
        title: "CRM",
        url: "/dashboard/crm",
        icon: ChartBar,
        // comingSoon: true
      },
      {
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
        // comingSoon: true
      },
      {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: Gauge,
        // comingSoon: true
      },
      {
        title: "Productivity",
        url: "/dashboard/productivity",
        icon: ListTodo,
        // comingSoon: true

      },
      {
        title: "E-commerce",
        url: "/dashboard/coming-soon",
        icon: ShoppingBag,
        comingSoon: true,
      },
      {
        title: "Academy",
        url: "/dashboard/coming-soon",
        icon: GraduationCap,
        comingSoon: true,
      },
      {
        title: "Logistics",
        url: "/dashboard/coming-soon",
        icon: Forklift,
        comingSoon: true,
      },
    ],
  },
  {
    id: 2,
    label: "Pages",
    items: [
      {
        title: "Email",
        url: "/dashboard/coming-soon",
        icon: Mail,
        comingSoon: false,
      },
      {
        title: "Chat",
        url: "/dashboard/coming-soon",
        icon: MessageSquare,
        comingSoon: false,
      },
      {
        title: "Calendar",
        url: "/dashboard/coming-soon",
        icon: Calendar,
        comingSoon: false,
      },
      {
        title: "Rider Dashboard",
        url: "/rider/dashboard",
        icon: Kanban,
        comingSoon: false,
      },
      {
        title: "Company Dashboard",
        url: "/company/dashboard",
        icon: ReceiptText,
        comingSoon: false,
      },
      {
        title: "Customers",
        url: "/company/customers",
        icon: Users,
        comingSoon: false,
      },
      {
        title: "Roles",
        url: "/dashboard/coming-soon",
        icon: Lock,
        comingSoon: false,
      },
    
    ],
  },

 
];
