import * as React from 'react';
import { Slot } from 'radix-ui';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...v: ClassValue[]) {
  return twMerge(clsx(v));
}
const variants = cva('button', {
  variants: {
    variant: {
      default: 'button-primary',
      outline: 'button-outline',
      ghost: 'button-ghost',
      destructive: 'button-destructive',
    },
    size: { default: '', sm: 'button-sm' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
});
export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof variants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button';
  return <Comp className={cn(variants({ variant, size }), className)} {...props} />;
}
export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={cn('input', props.className)} />;
}
export function Textarea(props: React.ComponentProps<'textarea'>) {
  return <textarea {...props} className={cn('input textarea', props.className)} />;
}
export function Badge({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={cn('badge', className)}>{children}</span>;
}
