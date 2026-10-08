'use client';

// The published design-system barrel includes Radix primitives, so keep its
// React context boundary on the client while the surrounding pages remain RSCs.
export {
  Badge,
  BrandMark,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Eyebrow,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@importio/design-system';
