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
        title: "Orders",
        url: "/company/orders",
        icon: Banknote,
        // comingSoon: true
      },
      {
        title: "Customers",
        url: "/company/customers",
        icon: Banknote,
        // comingSoon: true
      },
      //  {
      //   title: "Map",
      //   url: "/map",
      //   icon: Forklift,
      //   comingSoon: false,
      // },
      // {
      //   title: "POS",
      //   url: "/pos",
      //   icon: Banknote,
      //   // comingSoon: true
      // },
      // {
      //   title: "Analytics",
      //   url: "/dashboard/analytics",
      //   icon: Gauge,
      //   // comingSoon: true
      // },
      {
        title: "Transactions",
        url: "/dashboard/transactions",
        icon: ListTodo,
        // comingSoon: true

      },
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
        title: "Orders",
        url: "/rider/orders",
        icon: Banknote,
        // comingSoon: true
      },
      {
        title: "Customers",
        url: "/rider/customers",
        icon: Users,
        // comingSoon: true
      },
      //  {
      //   title: "Map",
      //   url: "/map",
      //   icon: Forklift,
      //   comingSoon: false,
      // },
      {
        title: "Inventory",
        url: "/dashboard/inventory",
        icon: Banknote,
        // comingSoon: true
        subItems: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
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

export const storeSidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Dashboards",
    items: [
      {
        title: "Dashboard",
        url: "/pos",
        icon: LayoutDashboard,
      }
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