'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useTransition,
} from 'react';

import { cn } from '@/lib/utils';

export const RESULTS_ID = 'ket-qua';

type NavigateOptions = { replace?: boolean; toResults?: boolean };

type CatalogNav = {
  isPending: boolean;
  navigate: (href: string, options?: NavigateOptions) => void;
};

const CatalogNavContext = createContext<CatalogNav | null>(null);

function scrollToResults() {
  const target = document.getElementById(RESULTS_ID);
  if (!target || target.getBoundingClientRect().top >= 0) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({
    behavior: reduce ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function CatalogNavProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (
      href: string,
      { replace = false, toResults = false }: NavigateOptions = {},
    ) => {
      if (toResults) scrollToResults();
      startTransition(() => {
        if (replace) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
      });
    },
    [router],
  );

  const value = useMemo(() => ({ isPending, navigate }), [isPending, navigate]);

  return (
    <CatalogNavContext.Provider value={value}>
      {children}
    </CatalogNavContext.Provider>
  );
}

export function useCatalogNav() {
  const context = useContext(CatalogNavContext);
  if (!context) throw new Error('useCatalogNav cần CatalogNavProvider');
  return context;
}

type CatalogLinkProps = Omit<React.ComponentProps<typeof Link>, 'href'> & {
  href: string;
  toResults?: boolean;
};

export function CatalogLink({
  href,
  toResults = false,
  onClick,
  ...props
}: CatalogLinkProps) {
  const { navigate } = useCatalogNav();

  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(href, { toResults });
      }}
      {...props}
    />
  );
}

export function CatalogResults({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useCatalogNav();

  return (
    <div
      id={RESULTS_ID}
      aria-busy={isPending}
      className={cn(
        'scroll-mt-28 transition-opacity duration-300 ease-soft motion-reduce:transition-none',
        isPending && 'pointer-events-none opacity-45',
        className,
      )}
    >
      {children}
    </div>
  );
}
