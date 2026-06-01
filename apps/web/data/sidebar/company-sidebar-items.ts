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

export const companySidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        url: "/analytics",
        icon: Users,
        // comingSoon: true
      },
      {
        title: "Team",
        url: "/team",
        icon: Users,
        // comingSoon: true
      },
      {
        title: "Customers",
        url: "/company/customers",
        icon: Banknote,
        // comingSoon: true
      },
       {
        title: "Map",
        url: "/map",
        icon: Forklift,
        comingSoon: false,
      },
      {
        title: "Test page",
        url: "/test",
        icon: Banknote,
        // comingSoon: true
      },
      // {
      //   title: "Analytics",
      //   url: "/dashboard/analytics",
      //   icon: Gauge,
      //   // comingSoon: true
      // },
      // {
      //   title: "Productivity",
      //   url: "/dashboard/productivity",
      //   icon: ListTodo,
      //   // comingSoon: true

      // },
      // {
      //   title: "E-commerce",
      //   url: "/dashboard/coming-soon",
      //   icon: ShoppingBag,
      //   comingSoon: true,
      // },
      // {
      //   title: "Academy",
      //   url: "/dashboard/coming-soon",
      //   icon: GraduationCap,
      //   comingSoon: true,
      // },
      // {
      //   title: "Logistics",
      //   url: "/dashboard/coming-soon",
      //   icon: Forklift,
      //   comingSoon: true,
      // },
    ],
  },

];

export const riderSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Customers",
        url: "/rider/customers",
        icon: Users,
        // comingSoon: true
      },
 
       {
        title: "Map",
        url: "/map",
        icon: Forklift,
        comingSoon: false,
      },
      {
        title: "Test page",
        url: "/test",
        icon: Banknote,
        // comingSoon: true
      },
      // {
      //   title: "Finance",
      //   url: "/dashboard/finance",
      //   icon: Banknote,
      //   // comingSoon: true
      // },
      // {
      //   title: "Analytics",
      //   url: "/dashboard/analytics",
      //   icon: Gauge,
      //   // comingSoon: true
      // },
      // {
      //   title: "Productivity",
      //   url: "/dashboard/productivity",
      //   icon: ListTodo,
      //   // comingSoon: true

      // },
      // {
      //   title: "E-commerce",
      //   url: "/dashboard/coming-soon",
      //   icon: ShoppingBag,
      //   comingSoon: true,
      // },
      // {
      //   title: "Academy",
      //   url: "/dashboard/coming-soon",
      //   icon: GraduationCap,
      //   comingSoon: true,
      // },
      // {
      //   title: "Logistics",
      //   url: "/dashboard/coming-soon",
      //   icon: Forklift,
      //   comingSoon: true,
      // },
    ],
  },

];
