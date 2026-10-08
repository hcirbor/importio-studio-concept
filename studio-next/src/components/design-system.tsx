'use client';

// The published design-system barrel includes Radix primitives, so keep its
// React context boundary on the client while the surrounding pages remain RSCs.
export {
  Badge,
  BrandMark,
  Button,
  Eyebrow,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@importio/design-system';
