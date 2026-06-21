'use client';

import { MenuIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  buttonVariants,
  cn,
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
    <header className="bg-background/80 sticky top-0 z-50 h-16 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <a href="#" aria-label={messages.brand.name}>
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-muted-foreground hover:text-primary rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a href="#login" className={cn(buttonVariants(), 'max-md:hidden')}>
            {messages.nav.login}
          </a>

          {/* Mobile nav */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline" size="icon" className="md:hidden">
                  <MenuIcon />
                  <span className="sr-only">{messages.nav.menu}</span>
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-52">
              {navItems.map((item) => (
                <DropdownMenuItem key={item.label} render={<a href={item.href}>{item.label}</a>} />
              ))}
              <DropdownMenuItem render={<a href="#login">{messages.nav.login}</a>} />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default SiteHeader;
