'use client';

import { type ReactNode } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { cn } from '@/lib/utils';

export type ActionSheetAction = {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
};

export type ActionSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
};

export function ActionSheet({
  open,
  onClose,
  title,
  description,
  actions,
  cancelLabel = 'Cancelar',
}: ActionSheetProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DrawerContent
        overlayClassName="z-[140]"
        className="z-[141] mt-24 h-auto max-h-[100dvh]"
        aria-label={title || 'Ações'}
      >
        {title || description ? (
          <DrawerHeader className="px-6 pt-4 text-center">
            {title ? (
              <DrawerTitle className="text-[17px] font-semibold tracking-tight text-zinc-100">
                {title}
              </DrawerTitle>
            ) : null}
            {description ? <DrawerDescription>{description}</DrawerDescription> : null}
          </DrawerHeader>
        ) : null}

        <DrawerBody className="mt-4 flex flex-col gap-2 px-3">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={action.onSelect}
              className={cn(
                'flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl border px-4 py-3.5 text-[15px] font-semibold transition-colors duration-200 active:scale-[0.99] disabled:opacity-40',
                action.destructive
                  ? 'border-red-500/20 bg-red-500/[0.08] text-red-500 hover:bg-red-500/[0.12] active:bg-red-500/[0.16]'
                  : 'border-zinc-800/70 bg-zinc-900/60 text-zinc-100 hover:bg-zinc-900 active:bg-white/[0.06]'
              )}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </DrawerBody>

        <DrawerFooter className="mt-3 px-3">
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-14 w-full items-center justify-center rounded-2xl border border-zinc-800/70 bg-zinc-900/60 px-4 py-3.5 text-[15px] font-semibold text-zinc-400 transition-colors duration-200 hover:bg-zinc-900 active:bg-white/[0.06]"
          >
            {cancelLabel}
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
