'use client';

import { MenuIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';

const navItems = [
  { label: messages.nav.tours, href: '#tours' },
  { label: messages.nav.destinations, href: '#destinations' },
  { label: messages.nav.about, href: '#about' },
  { label: messages.nav.contact, href: '#contact' },
] as const;

export function SiteHeader() {
  return (
    <header className="bg-background sticky top-0 z-50 h-16 border-b">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#" aria-label={messages.brand.name}>
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav className="flex flex-wrap items-center justify-start gap-0 max-md:hidden" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-muted-foreground hover:text-primary px-3 py-1.5 text-base font-medium"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop login */}
        <Button
          size="lg"
          className="max-md:hidden"
          render={<a href="#login" />}
          nativeButton={false}
        >
          {messages.nav.login}
        </Button>

        {/* Mobile actions */}
        <div className="flex gap-4 md:hidden">
          <Button size="lg" render={<a href="#login" />} nativeButton={false}>
            {messages.nav.login}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon-lg" />}>
              <MenuIcon />
              <span className="sr-only">{messages.nav.menu}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.label}>
                  <a href={item.href}>{item.label}</a>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
