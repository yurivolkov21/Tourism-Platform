'use client';

import { MenuIcon } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  buttonVariants,
  cn,
} from '@tourism/ui';
import { messages } from '@tourism/i18n';

import { Logo } from '../brand/logo';
import { TopBar } from './top-bar';

const linkClass = 'text-muted-foreground hover:text-primary px-2.5 py-1.5 text-sm font-medium transition-colors';

// Flat nav for the mobile dropdown — expands Destinations into its region pages.
const mobileNav = [
  { label: messages.nav.tours, href: '/tours' },
  ...messages.nav.destinationsMenu.items.map((i) => ({ label: i.label, href: i.href })),
  { label: messages.nav.about, href: '/about' },
  { label: messages.nav.contact, href: '/contact' },
];

export function SiteHeader() {
  const t = messages.nav;

  return (
    <>
      <TopBar />

      <header className="bg-background sticky top-0 z-50 border-b">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <a href="#" aria-label={messages.brand.name}>
            <Logo />
          </a>

          {/* Desktop nav */}
          <nav className="flex items-center gap-1 max-md:hidden" aria-label="Primary">
            <NavigationMenu>
              <NavigationMenuList>
                {[t.toursMenu, t.destinationsMenu].map((menu) => (
                  <NavigationMenuItem key={menu.label}>
                    <NavigationMenuTrigger>{menu.label}</NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-md grid-cols-2 gap-1 p-2">
                        {menu.items.map((item) => (
                          <li key={item.label}>
                            <NavigationMenuLink render={<a href={item.href} />}>
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-muted-foreground text-xs">{item.hint}</span>
                              </div>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>

            <a href="/about" className={linkClass}>
              {t.about}
            </a>
            <a href="/contact" className={linkClass}>
              {t.contact}
            </a>
          </nav>

          {/* Desktop actions */}
          <div className="flex items-center gap-4 max-md:hidden">
            <a href="#login" className={linkClass}>
              {t.login}
            </a>
            <Button render={<a href="#contact" />} nativeButton={false}>
              {t.planTrip}
            </Button>
          </div>

          {/* Mobile actions */}
          <div className="flex items-center gap-3 md:hidden">
            <a
              href="#contact"
              className={cn(buttonVariants({ size: 'default' }), 'max-[400px]:hidden')}
            >
              {t.planTrip}
            </a>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon-lg" />}>
                <MenuIcon />
                <span className="sr-only">{t.menu}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                {mobileNav.map((item) => (
                  <DropdownMenuItem key={item.label} render={<a href={item.href} />}>
                    {item.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<a href="#login" />}>{t.login}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}

export default SiteHeader;
