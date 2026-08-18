import type { ComponentType, SVGProps } from "react";
import type { LucideProps } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  Compass,
  EyeOff,
  FileText,
  Handshake,
  Home,
  Inbox,
  KeyRound,
  LayoutGrid,
  ListTodo,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  Warehouse,
  X,
} from "lucide-react";

type IconProps = LucideProps & { className?: string };

function withDefaults(Icon: ComponentType<LucideProps>, props: IconProps) {
  const { className, strokeWidth, ...rest } = props;
  return (
    <Icon
      aria-hidden
      strokeWidth={strokeWidth ?? 1.75}
      className={className ?? "h-4 w-4"}
      {...rest}
    />
  );
}

export function IconGrid(props: IconProps) {
  return withDefaults(LayoutGrid, props);
}
export function IconInbox(props: IconProps) {
  return withDefaults(Inbox, props);
}
export function IconCalendar(props: IconProps) {
  return withDefaults(CalendarDays, props);
}
export function IconBuilding(props: IconProps) {
  return withDefaults(Building2, props);
}
export function IconWarehouse(props: IconProps) {
  return withDefaults(Warehouse, props);
}
export function IconHome(props: IconProps) {
  return withDefaults(Home, props);
}
export function IconUsers(props: IconProps) {
  return withDefaults(Users, props);
}
export function IconCog(props: IconProps) {
  return withDefaults(Settings, props);
}
export function IconCheck(props: IconProps) {
  return withDefaults(Check, props);
}
export function IconTasks(props: IconProps) {
  return withDefaults(ListTodo, props);
}
export function IconSearch(props: IconProps) {
  return withDefaults(Search, props);
}
export function IconBell(props: IconProps) {
  return withDefaults(Bell, props);
}
export function IconMore(props: IconProps) {
  return withDefaults(MoreHorizontal, props);
}
export function IconMail(props: IconProps) {
  return withDefaults(Mail, props);
}
export function IconPhone(props: IconProps) {
  return withDefaults(Phone, props);
}
export function IconMapPin(props: IconProps) {
  return withDefaults(MapPin, props);
}
export function IconClock(props: IconProps) {
  return withDefaults(Clock3, props);
}
export function IconMenu(props: IconProps) {
  return withDefaults(Menu, props);
}
export function IconClose(props: IconProps) {
  return withDefaults(X, props);
}
export function IconArrowRight(props: IconProps) {
  return withDefaults(ArrowRight, props);
}
export function IconChevronDown(props: IconProps) {
  return withDefaults(ChevronDown, props);
}
export function IconMessage(props: IconProps) {
  return withDefaults(MessageCircle, props);
}
export function IconKey(props: IconProps) {
  return withDefaults(KeyRound, props);
}
export function IconClipboard(props: IconProps) {
  return withDefaults(ClipboardList, props);
}
export function IconHandshake(props: IconProps) {
  return withDefaults(Handshake, props);
}
export function IconBriefcase(props: IconProps) {
  return withDefaults(BriefcaseBusiness, props);
}
export function IconTrending(props: IconProps) {
  return withDefaults(TrendingUp, props);
}
export function IconEyeOff(props: IconProps) {
  return withDefaults(EyeOff, props);
}
export function IconShield(props: IconProps) {
  return withDefaults(ShieldCheck, props);
}
export function IconFile(props: IconProps) {
  return withDefaults(FileText, props);
}
export function IconScale(props: IconProps) {
  return withDefaults(Scale, props);
}
export function IconBadge(props: IconProps) {
  return withDefaults(BadgeCheck, props);
}
export function IconCompass(props: IconProps) {
  return withDefaults(Compass, props);
}

/** Official WhatsApp glyph — Lucide has no brand mark. */
export function IconWhatsApp(props: SVGProps<SVGSVGElement> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className ?? "h-4 w-4"}
      fill="currentColor"
      aria-hidden
      {...rest}
    >
      <path d="M19.05 4.91A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02Zm-7.01 15.24h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.55-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.4-.12-.56.12-.17.25-.64.8-.79.97-.15.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.42h-.48c-.17 0-.43.06-.66.31-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.17-.48-.29Z" />
    </svg>
  );
}

export function IconFacebook(props: SVGProps<SVGSVGElement> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-4 w-4"} fill="currentColor" aria-hidden {...rest}>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.09 10.12 24v-8.44H7.08v-3.49h3.04V9.41c0-3.03 1.79-4.7 4.53-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.95.93-1.95 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.1 24 12.07Z" />
    </svg>
  );
}

export function IconInstagram(props: SVGProps<SVGSVGElement> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-4 w-4"} fill="currentColor" aria-hidden {...rest}>
      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.8A3.95 3.95 0 0 0 3.8 7.75v8.5a3.95 3.95 0 0 0 3.95 3.95h8.5a3.95 3.95 0 0 0 3.95-3.95v-8.5a3.95 3.95 0 0 0-3.95-3.95h-8.5Zm8.98 1.35a1.08 1.08 0 1 1 0 2.16 1.08 1.08 0 0 1 0-2.16ZM12 6.86A5.14 5.14 0 1 1 6.86 12 5.15 5.15 0 0 1 12 6.86Zm0 1.8A3.34 3.34 0 1 0 15.34 12 3.34 3.34 0 0 0 12 8.66Z" />
    </svg>
  );
}

export function IconLinkedIn(props: SVGProps<SVGSVGElement> & { className?: string }) {
  const { className, ...rest } = props;
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-4 w-4"} fill="currentColor" aria-hidden {...rest}>
      <path d="M4.98 3.5a2.49 2.49 0 1 1 0 4.98 2.49 2.49 0 0 1 0-4.98ZM2.8 9.25h4.36V21H2.8V9.25Zm7.1 0h4.18v1.6h.06c.58-1.1 2-2.26 4.12-2.26 4.4 0 5.21 2.9 5.21 6.67V21H19.1v-5.07c0-1.21-.02-2.77-1.69-2.77-1.69 0-1.95 1.32-1.95 2.68V21H9.9V9.25Z" />
    </svg>
  );
}
